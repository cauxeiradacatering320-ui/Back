export interface UserPayload {
  id: string;
  role: 'admin' | 'produtor' | 'aluno';
}

export interface UserData {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: 'admin' | 'produtor' | 'aluno';
}

export interface AuthResponse {
  user: UserData;
  accessToken: string;
  refreshToken: string;
}

export interface ConteudoRow {
  id: string;
  modulo_id: string;
  tipo: 'video' | 'texto' | 'questao';
  titulo: string;
  posicao: number;
  preview: boolean;
  dados: Record<string, unknown>;
  criado_em: string;
  atualizado_em: string;
}
