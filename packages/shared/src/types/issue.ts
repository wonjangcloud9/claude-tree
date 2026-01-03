export interface Issue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: 'open' | 'closed';
  url: string;
}

export interface CreatePRInput {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
}
