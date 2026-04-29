'use server'

/**
 * 🚨 ARXIU LIQUIDAT - ARQUITECTURA DESACOBLADA
 * 
 * Aquest fitxer ja no conté lògica de negoci. Totes les funcions s'han mogut
 * als seus dominis respectius per millorar la seguretat i mantenibilitat.
 * 
 * Actualitza els teus imports:
 * - @/lib/actions/auth         -> Autenticació i Rols
 * - @/lib/actions/content      -> Rutes, POIs i Municipis
 * - @/lib/actions/gamification -> XP, Passaport i Visites
 * - @/lib/actions/storage      -> Uploads i Fitxers
 */

export * from './actions/auth';
export * from './actions/content';
export * from './actions/gamification';
export * from './actions/storage';
