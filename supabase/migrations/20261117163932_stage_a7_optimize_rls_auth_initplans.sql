-- Cache auth.uid() once per statement in RLS policy expressions.
-- This preserves each policy's existing predicate and role scope.
ALTER POLICY "members view their company roster" ON public."company_members" USING ((is_company_member(company_id) OR (user_id = (select auth.uid()))));
ALTER POLICY "own notification preferences" ON public."notification_preferences" USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "company members or self insert" ON public."notifications" WITH CHECK ((((company_id IS NULL) AND ((select auth.uid()) = user_id)) OR ((company_id IS NOT NULL) AND is_company_member(company_id))));
ALTER POLICY "recipient delete" ON public."notifications" USING (((select auth.uid()) = user_id));
ALTER POLICY "recipient select" ON public."notifications" USING (((select auth.uid()) = user_id));
ALTER POLICY "recipient update" ON public."notifications" USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "users manage their own onboarding progress" ON public."onboarding_progress" USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "invitee views own invitation" ON public."organization_invitations" USING ((lower(email) = lower((( SELECT users.email
   FROM auth.users
  WHERE (users.id = (select auth.uid()))))::text)));
ALTER POLICY "members view org members" ON public."organization_members" USING ((is_org_member(organization_id) OR (user_id = (select auth.uid()))));
ALTER POLICY "owner bootstraps membership" ON public."organization_members" WITH CHECK (((role = 'owner'::org_member_role) AND (user_id = (select auth.uid())) AND (EXISTS ( SELECT 1
   FROM organizations o
  WHERE ((o.id = organization_members.organization_id) AND (o.owner_id = (select auth.uid())))))));
ALTER POLICY "owner deletes org" ON public."organizations" USING ((owner_id = (select auth.uid())));
ALTER POLICY "users create orgs" ON public."organizations" WITH CHECK ((owner_id = (select auth.uid())));
ALTER POLICY "Users insert own profile" ON public."profiles" WITH CHECK (((select auth.uid()) = id));
ALTER POLICY "Users update own profile" ON public."profiles" USING (((select auth.uid()) = id));
ALTER POLICY "Users view own profile" ON public."profiles" USING (((select auth.uid()) = id));
ALTER POLICY "own presets delete" ON public."report_view_presets" USING ((user_id = (select auth.uid())));
ALTER POLICY "own presets insert" ON public."report_view_presets" WITH CHECK (((user_id = (select auth.uid())) AND is_company_member(company_id)));
ALTER POLICY "own presets select" ON public."report_view_presets" USING (((user_id = (select auth.uid())) AND is_company_member(company_id)));
ALTER POLICY "own presets update" ON public."report_view_presets" USING ((user_id = (select auth.uid()))) WITH CHECK ((user_id = (select auth.uid())));
ALTER POLICY "subscriptions_select_own" ON public."subscriptions" USING (((owner_id = (select auth.uid())) OR (user_id = (select auth.uid())) OR ((company_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM company_members m
  WHERE ((m.company_id = subscriptions.company_id) AND (m.user_id = (select auth.uid()))))))));
ALTER POLICY "own sessions" ON public."user_sessions" USING (((select auth.uid()) = user_id)) WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can insert their own workspace settings" ON public."workspace_settings" WITH CHECK (((select auth.uid()) = user_id));
ALTER POLICY "Users can update their own workspace settings" ON public."workspace_settings" USING (((select auth.uid()) = user_id));
ALTER POLICY "Users can view their own workspace settings" ON public."workspace_settings" USING (((select auth.uid()) = user_id));
