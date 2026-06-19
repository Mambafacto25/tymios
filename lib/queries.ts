// Requête de lecture des pièces, partagée entre le serveur (rendu initial)
// et le client (rafraîchissement temps réel) pour rester cohérente.
export const PIECE_SELECT = `
  id, numero_serie, numero_of, designation_article, titre_operation,
  priorite, echeance, statut_courant,
  atelier:ateliers ( nom, pole:poles ( libelle, couleur ) ),
  proprietaire:users!proprietaire_courant_id ( prenom, nom )
`;
