// Contatos captados na página inicial.

import { db } from './db.js';
import { leads } from './schema.js';

export interface Lead {
  email: string;
  name: string | null;
  source: string;
}

export interface LeadStore {
  // Repetir um e-mail não é erro: a pessoa só continua na lista.
  save(lead: Lead): Promise<void>;
}

export const postgresLeads: LeadStore = {
  async save(lead) {
    await db().insert(leads).values(lead).onConflictDoNothing();
  },
};
