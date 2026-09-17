export interface AuthUser {
  sub: number;
  login: string;
  funcionarioId: number;
  nomeCompleto: string;
  permissoes: Array<{
    modulo: string;
    podeVisualizar: boolean;
    podeGerenciar: boolean;
  }>;
}
