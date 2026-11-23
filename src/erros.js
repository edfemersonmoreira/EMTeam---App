// Mensagens de erro em português claro para quem usa o app.
// O texto técnico (em inglês, vindo do Supabase ou do navegador) não aparece na tela: vai só para o console,
// onde continua disponível para diagnóstico. Não muda nenhuma regra: só a forma de mostrar o erro.

const GENERICO = 'Não foi possível concluir agora. Tente novamente em instantes.'

const REGRAS = [
  [e => /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(e.m), 'Sem conexão com a internet. Verifique a rede e tente de novo.'],
  [e => e.code === 'PGRST301' || /jwt|refresh token|session (?:not found|missing|expired)/i.test(e.m), 'Sua sessão expirou. Saia e entre novamente.'],
  [e => e.code === '42501' || /permission denied|row-level security|not authorized|unauthorized/i.test(e.m), 'Você não tem permissão para fazer isso.'],
  [e => e.code === '23505' || /duplicate key/i.test(e.m), 'Já existe um registro com esses dados.'],
  [e => e.code === '23503' || /foreign key/i.test(e.m), 'Este item está ligado a outros registros e não pode ser removido.'],
  [e => ['23502', '23514', '22P02', '22003'].includes(e.code) || /invalid input|violates check|out of range/i.test(e.m), 'Algum valor informado não é válido. Confira os campos.'],
  [e => e.code === 'PGRST116' || /multiple \(or no\) rows/i.test(e.m), 'Não foi possível encontrar estes dados. Atualize a página.'],
  [e => /should be different from the old/i.test(e.m), 'A nova senha precisa ser diferente da atual.'],
  [e => /password should be|weak password|at least \d+ characters/i.test(e.m), 'A senha é fraca. Use pelo menos 6 caracteres, misturando letras e números.'],
  [e => /payload too large|exceeded the maximum|file size/i.test(e.m), 'O arquivo é grande demais.'],
]

// erro: objeto de erro (Supabase, fetch ou Error). padrao: frase usada quando o erro não é reconhecido
// (use '' quando a tela já mostra uma frase própria antes da mensagem).
export function mensagemErro(erro, padrao = GENERICO) {
  if (!erro) return ''
  if (erro.amigavel) return erro.message   // erro criado pelo próprio app, já escrito para a pessoa
  console.error('[EM Team]', erro)
  const e = { m: String(erro.message || erro.error_description || erro || ''), code: String(erro.code || '') }
  const regra = REGRAS.find(([teste]) => teste(e))
  return regra ? regra[1] : padrao
}

// Erro com mensagem já pronta para a pessoa (não passa pelas regras acima).
export const erroAmigavel = texto => Object.assign(new Error(texto), { amigavel: true })
