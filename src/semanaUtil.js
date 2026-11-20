// Estado de cada dia na faixa da semana (tela inicial da aluna).
//   feito     treino concluído
//   plan      treino programado e ainda não realizado (hoje ou dias que virão)
//   falta     treino programado de um dia que já passou e não foi realizado (comunicado de forma neutra)
//   sem       dia sem treino programado (descanso). Não usar o nome 'descanso': já existe a classe .descanso do cronômetro de descanso entre séries.
export function estadoDoDia({ feito, programado, passado }) {
  if (feito) return 'feito'
  if (programado && passado) return 'falta'
  if (programado) return 'plan'
  return 'sem'
}
