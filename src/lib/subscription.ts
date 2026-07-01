/**
 * Abonnement d'un compte web (gérant). Énumération ouverte côté API :
 * d'autres paliers pourront apparaître plus tard, on traite donc la valeur
 * comme une `string` (autocomplétion conservée pour les valeurs connues).
 */
export type Subscription = "NONE" | "INFINITY" | (string & {})
