do $$
declare
  v_allowed boolean;
  v_count integer;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.demo_requests'::regclass) then
    raise exception 'demo_requests must have RLS enabled';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.demo_request_rate_limits'::regclass) then
    raise exception 'demo_request_rate_limits must have RLS enabled';
  end if;

  if has_table_privilege('anon', 'public.demo_requests', 'SELECT')
     or has_table_privilege('authenticated', 'public.demo_requests', 'SELECT')
     or has_table_privilege('anon', 'public.demo_requests', 'INSERT')
     or has_table_privilege('authenticated', 'public.demo_requests', 'INSERT') then
    raise exception 'browser roles must not access demo_requests';
  end if;
  if not has_table_privilege('service_role', 'public.demo_requests', 'INSERT')
     or not has_table_privilege('service_role', 'public.demo_requests', 'SELECT')
     or not has_table_privilege('service_role', 'public.demo_requests', 'UPDATE') then
    raise exception 'service_role is missing required demo_requests privileges';
  end if;
  if has_function_privilege('anon', 'public.consume_demo_request_rate_limit(text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.consume_demo_request_rate_limit(text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.consume_demo_request_rate_limit(text)', 'EXECUTE') then
    raise exception 'rate-limit RPC privileges are incorrect';
  end if;

  if public.consume_demo_request_rate_limit(repeat('a', 64)) is not true then
    raise exception 'first rate-limit request should be allowed';
  end if;
  if public.consume_demo_request_rate_limit(repeat('a', 64)) is not true then
    raise exception 'second rate-limit request should be allowed';
  end if;
  if public.consume_demo_request_rate_limit(repeat('a', 64)) is not true then
    raise exception 'third rate-limit request should be allowed';
  end if;
  if public.consume_demo_request_rate_limit(repeat('a', 64)) is not false then
    raise exception 'fourth rate-limit request should be rejected';
  end if;

  update public.demo_request_rate_limits
  set window_started_at = now() - interval '2 hours'
  where ip_hash = repeat('a', 64);
  if public.consume_demo_request_rate_limit(repeat('a', 64)) is not true then
    raise exception 'rate limit should reset after one hour';
  end if;
  if public.consume_demo_request_rate_limit('not-a-valid-hash') is not false then
    raise exception 'invalid IP hash must be rejected';
  end if;

  insert into public.demo_requests (
    full_name, business_name, email, business_type, challenge,
    preferred_time, demo_contact_consent, marketing_consent, submission_fingerprint
  ) values (
    'Test User', 'Test Studio', 'test@example.com', 'small_business',
    'We need help tracking invoices and expenses.', 'flexible', true, false, repeat('b', 64)
  );

  select count(*) into v_count from public.demo_requests where email = 'test@example.com';
  if v_count <> 1 then raise exception 'valid demo request was not inserted'; end if;

  begin
    insert into public.demo_requests (
      full_name, business_name, email, business_type, challenge,
      preferred_time, demo_contact_consent, marketing_consent, submission_fingerprint
    ) values (
      'Test User', 'Test Studio', 'no-consent@example.com', 'small_business',
      'We need help tracking invoices and expenses.', 'flexible', false, false, repeat('c', 64)
    );
    raise exception 'request without demo-contact consent was accepted';
  exception when check_violation then
    null;
  end;
end
$$;

select 'demo request migration smoke tests passed' as result;
