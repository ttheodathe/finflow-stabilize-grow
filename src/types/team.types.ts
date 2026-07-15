export type MemberStatus = 'invited' | 'active' | 'suspended' | 'removed';
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type RoleKey =
  | 'owner'
  | 'admin'
  | 'accountant'
  | 'manager'
  | 'employee'
  | 'viewer'
  | (string & {}); // allow company-defined custom roles

export type PermissionKey =
  | 'users.invite'
  | 'users.remove'
  | 'users.change_role'
  | 'billing.manage'
  | 'company.settings'
  | 'company.delete'
  | 'invoice.create'
  | 'invoice.edit'
  | 'invoice.delete'
  | 'expense.create'
  | 'expense.approve'
  | 'reports.view'
  | 'inventory.manage'
  | 'payroll.manage'
  | (string & {});

export interface Role {
  id: string;
  company_id: string | null;
  key: RoleKey;
  name: string;
  description: string | null;
  is_system: boolean;
  is_removable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  key: PermissionKey;
  category: string;
  label: string;
  description: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role_id: string;
  status: MemberStatus;
  joined_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
  // joined relations, populated by the service layer
  profile?: Profile;
  role?: Role;
  last_active_at?: string | null;
}

export interface TeamInvitation {
  id: string;
  company_id: string;
  email: string;
  role_id: string;
  token: string;
  personal_message: string | null;
  status: InvitationStatus;
  expires_at: string;
  invited_by: string;
  accepted_at: string | null;
  created_at: string;
  role?: Role;
  invited_by_profile?: Profile;
}

export interface SeatUsage {
  used: number;
  limit: number | null; // null = unlimited
}

export interface AuditLogEntry {
  id: string;
  company_id: string;
  actor_id: string | null;
  target_user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
  target_user?: Profile;
}

/** Thrown by service functions for known, user-facing error states. */
export class TeamServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'TeamServiceError';
    this.code = code;
  }
}
