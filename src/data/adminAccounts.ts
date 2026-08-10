// src/data/adminAccounts.ts

export interface AdminAccount {
  userOrEmail: string[];
  passOrPin: string[];
  name: string;
  role: string;
}

export const OFFICIAL_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    userOrEmail: ['cajacuenta767@gmail.com', 'admin@avend.pe', 'juan.avend', 'admin', 'cajacuenta767'],
    passOrPin: ['987654', 'AdminAvend2026!'],
    name: 'Juan Avend',
    role: 'SUPERADMINISTRADOR',
  },
  {
    userOrEmail: ['administrador@avend.pe', 'admin01@avend.pe', 'admin01'],
    passOrPin: ['AvendAdmin2026!', '123456'],
    name: 'Administrador 01',
    role: 'ADMINISTRADOR',
  },
  {
    userOrEmail: ['soporte@avend.pe', 'admin02@avend.pe', 'carlos.mendoza'],
    passOrPin: ['SoporteAvend2026!', '2026'],
    name: 'Carlos Mendoza (Soporte)',
    role: 'ADMINISTRADOR',
  },
  {
    userOrEmail: ['evaluaciones@avend.pe', 'admin03@avend.pe', 'maria.fernanda'],
    passOrPin: ['MineduAvend2026!', '2026'],
    name: 'María Fernanda (MINEDU)',
    role: 'ADMINISTRADOR',
  },
  {
    userOrEmail: ['auditoria@avend.pe', 'admin04@avend.pe', 'diego.ramirez'],
    passOrPin: ['AuditoriaAvend2026!', '2026'],
    name: 'Diego Ramírez (Auditor)',
    role: 'ADMINISTRADOR',
  },
];
