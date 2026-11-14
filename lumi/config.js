/* Lümi · branchement à la base de données.
 * Tant que « url » est vide, le site tourne en MODE DÉMO : données fictives,
 * enregistrées seulement dans le navigateur de celui qui regarde.
 * Pour brancher la base : coller ici l'adresse du projet Supabase et sa clé publique
 * (« anon key »). Cette clé est faite pour être visible : ce sont les règles de
 * base/schema.sql qui protègent les données, pas le secret de la clé. */
window.LUMI_CONFIG = {
  url: '',
  cle: '',
};
