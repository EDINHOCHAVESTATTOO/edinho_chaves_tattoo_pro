export const DOCUMENT_BUCKET = 'studio-private-docs';
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

export async function validateDocument(file: Blob): Promise<string> {
  if (!DOCUMENT_TYPES[file.type]) throw new Error('Use PDF, JPG, PNG ou WebP.');
  if (!file.size || file.size > MAX_DOCUMENT_SIZE) throw new Error('O arquivo deve ter até 5 MB e não pode estar vazio.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const valid = file.type === 'application/pdf' ? text.startsWith('%PDF-')
    : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((b, i) => bytes[i] === b)
    : file.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP';
  if (!valid) throw new Error('O conteúdo do arquivo não corresponde ao formato informado.');
  return DOCUMENT_TYPES[file.type];
}

export function normalizeRecipient(value: string): string {
  if (!/^[+\d\s().-]+$/.test(value)) throw new Error('Informe um telefone válido com DDI.');
  let digits = value.replace(/\D/g, '');
  if (!value.trim().startsWith('+') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error('Informe um telefone válido com DDI.');
  return digits;
}

export function minorAge(birthDate: string, now = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error('Informe a data de nascimento do menor.');
  const date = new Date(`${birthDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate) throw new Error('Data de nascimento inválida.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const age = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4)) - (today.slice(5) < birthDate.slice(5) ? 1 : 0);
  if (birthDate > today || age < 0 || age >= 18) throw new Error('Esta autorização é destinada a clientes menores de 18 anos. Confira a data de nascimento.');
  return age;
}

export type GuardianData = { clientName: string; birthDate: string; clientDocument: string; guardianName: string; guardianDocument: string; relationship: string; guardianPhone: string; procedure: string; location: string; professional: string };
export function guardianAuthorization(data: GuardianData, now = new Date()): string {
  for (const value of Object.values(data)) if (!value.trim()) throw new Error('Preencha todos os dados do menor, do responsável e do procedimento.');
  minorAge(data.birthDate, now);
  normalizeRecipient(data.guardianPhone);
  return `AUTORIZAÇÃO DO RESPONSÁVEL LEGAL POR MENOR DE 18 ANOS\nVersão 1 · Edinho Chaves Tattoo\n\nMenor: ${data.clientName.trim()}\nNascimento: ${data.birthDate.split('-').reverse().join('/')}\nDocumento do menor: ${data.clientDocument.trim()}\nResponsável legal: ${data.guardianName.trim()}\nDocumento do responsável: ${data.guardianDocument.trim()}\nVínculo: ${data.relationship.trim()}\nTelefone do responsável: ${data.guardianPhone.trim()}\nProcedimento: ${data.procedure.trim()}\nRegião do corpo: ${data.location.trim()}\nProfissional: ${data.professional.trim()}\n\nDeclaro ser pai, mãe ou responsável legal pelo menor identificado e autorizo especificamente o procedimento e a região do corpo descritos neste documento. Apresentei os documentos de identificação e de representação legal ao estúdio para conferência.\n\nRecebi explicações sobre as características do procedimento, seus riscos de dor, sangramento, infecção, reação alérgica, cicatrizes, queloides e alterações na cicatrização, bem como orientações de higiene e cuidados posteriores. Quando se tratar de tatuagem, estou ciente de seu caráter permanente e da dificuldade de remoção. Tive oportunidade de esclarecer dúvidas e posso retirar esta autorização antes do início do procedimento.\n\nEsta autorização não substitui a anamnese, o consentimento informado do atendimento nem a avaliação do profissional. A realização permanece condicionada às normas sanitárias e às restrições de idade e procedimento aplicáveis no município. A assinatura não afasta direitos previstos em lei.\n\nAssinatura do responsável legal: ${data.guardianName.trim()}`;
}
