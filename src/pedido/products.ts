import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Modelo que consume la UI del flujo /pedido. Conserva los campos `publicPrice`,
// `discount` y `clientPrice` que ProductsStep ya espera; los derivamos del
// `unit_price` real del catálogo en Supabase aplicando el 20% de descuento de
// distribuidor (mismo branding que ya tenía el sitio).
export interface Product {
  id: string;
  name: string;
  description: string;
  publicPrice: number;
  discount: number;
  clientPrice: number;
}

// Porcentaje de descuento sobre el precio al público (rate distribuidor).
const DISTRIBUTOR_DISCOUNT_RATE = 0.20;

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  unit_price: number | string;
  active: boolean;
}

function mapRow(row: ProductRow): Product {
  const clientPrice = Number(row.unit_price);
  // publicPrice = clientPrice / (1 - 0.20). Redondeamos al entero más cercano
  // para que se vea limpio en pantalla ($349, $99) sin decimales.
  const publicPrice = Math.round(clientPrice / (1 - DISTRIBUTOR_DISCOUNT_RATE));
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    publicPrice,
    clientPrice,
    discount: publicPrice - clientPrice,
  };
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
}

/**
 * Carga el catálogo público (sólo productos activos) ordenado por precio
 * ascendente para que las opciones más accesibles aparezcan primero.
 */
export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from('products')
        .select('id, name, description, unit_price, active')
        .eq('active', true)
        .order('unit_price', { ascending: true });

      if (cancelled) return;

      if (dbError) {
        setError(dbError.message);
        setProducts([]);
      } else {
        setProducts(((data ?? []) as ProductRow[]).map(mapRow));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, error };
}
