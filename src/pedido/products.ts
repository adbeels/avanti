export interface Product {
  id: string;
  name: string;
  description: string;
  publicPrice: number;
  discount: number;
  clientPrice: number;
}

export const products: Product[] = [
  {
    id: 'caja-100-sobres',
    name: 'Caja',
    description: 'Contiene 100 sobres',
    publicPrice: 2500,
    discount: 500,
    clientPrice: 2000,
  },
  {
    id: 'album-soft-cover',
    name: 'Album Soft Cover',
    description: '112 paginas',
    publicPrice: 99,
    discount: 19,
    clientPrice: 80,
  },
  {
    id: 'album-pasta-dura',
    name: 'Album Pasta Dura',
    description: '112 paginas',
    publicPrice: 349,
    discount: 69,
    clientPrice: 280,
  },
  {
    id: 'corrugado-16-cajas',
    name: 'Corrugado con 16 cajas',
    description: 'Contiene 16 cajas de 100 sobres c/u',
    publicPrice: 40000,
    discount: 8000,
    clientPrice: 32000,
  },
];
