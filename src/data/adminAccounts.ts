// src/data/adminAccounts.ts

export interface AdminAccount {
  userOrEmail: string[];
  passOrPin: string[];
  name: string;
  role: string;
}

export const OFFICIAL_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    userOrEmail: (process.env.ADMIN_PRIMARY_IDENTIFIERS || 'cajacuenta767@gmail.com,cajacuenta767').split(',').map((v) => v.trim()).filter(Boolean),
    passOrPin: [process.env.ADMIN_PRIMARY_PASSWORD || ''].filter(Boolean),
    name: 'Bryan',
    role: 'SUPERADMINISTRADOR',
  },
  {
    userOrEmail: (process.env.ADMIN_SECONDARY_IDENTIFIERS || 'avendoficial@gmail.com,avendoficial').split(',').map((v) => v.trim()).filter(Boolean),
    passOrPin: [process.env.ADMIN_SECONDARY_PASSWORD || ''].filter(Boolean),
    name: 'Superadministrador AVEND',
    role: 'SUPERADMINISTRADOR',
  },
];
