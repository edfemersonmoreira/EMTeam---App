// Etiqueta de estado ou rótulo curto, num formato único para o app inteiro.
// tipo: 'sucesso' (ativa, em uso) · 'neutra' (inativa, arquivada, informação) · 'destaque' (pede atenção)
export default function Etiqueta({ tipo = 'neutra', children }) {
  return <span className={'etiqueta ' + tipo}>{children}</span>
}
