const ADVICE_IN =
  /(conviene|convenga|è meglio|e' meglio|meglio (la|il|una|un|scegliere)|cosa mi consigli|consigliate|cambiare (polizza|compagnia|assicurazione)|disdire|quale polizza|altra compagnia|investire)/i;
const MEDICAL_IN =
  /(sintom|diagnos|è grave|che malattia|ho (mal di|dolore|febbre)|devo fare (la|una|il|un|l')\s*(risonanza|tac|visita|esame|intervento)|che (cura|terapia|medicina))/i;
const ADVICE_OUT =
  /(ti conviene|ti consiglio|ti suggerisco|è meglio (che|scegliere|andare)|dovresti (scegliere|cambiare|fare|andare))/i;

export type GuardVerdict = { blocked: false } | { blocked: true; kind: 'consulenza' | 'medico'; message: string };

const MESSAGES = {
  consulenza:
    'Questa è una scelta personale e non posso consigliarti cosa fare. Posso spiegarti cosa dice la tua polizza. Per un consiglio parla con la tua agenzia o con la compagnia.',
  medico:
    'Non posso dare consigli medici. Per sintomi, esami o cure parla con il tuo medico. Posso spiegarti cosa copre la tua polizza.',
};

export function checkQuestion(q: string): GuardVerdict {
  if (MEDICAL_IN.test(q)) return { blocked: true, kind: 'medico', message: MESSAGES.medico };
  if (ADVICE_IN.test(q)) return { blocked: true, kind: 'consulenza', message: MESSAGES.consulenza };
  return { blocked: false };
}

export function checkAnswer(a: string): GuardVerdict {
  return ADVICE_OUT.test(a) ? { blocked: true, kind: 'consulenza', message: MESSAGES.consulenza } : { blocked: false };
}
