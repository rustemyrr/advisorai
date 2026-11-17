/**
 * Fired by the "leave a request" button on an agent card, listened to by the
 * consultation form further down the same page.
 *
 * A plain DOM event rather than shared state or a query parameter: the button
 * is an anchor to #consultation and must keep working as one, the form is in a
 * different part of the tree, and a request that says which agent it is about
 * is the difference between a useful notification and a bare phone number.
 */
export const CONSULTATION_PREFILL_EVENT = "advisorai:consultation-prefill";

export type ConsultationPrefillDetail = { about: string };
