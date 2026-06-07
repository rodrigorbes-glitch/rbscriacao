import Storefront from '@/components/public/Storefront';
import { produtosAPI, configuracoesAPI } from '@/services/api';

// Força a página a ser dinâmica para sempre buscar os dados frescos do banco
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  try {
    const [prods, config] = await Promise.all([
      produtosAPI.getAll(),
      configuracoesAPI.getGeral()
    ]);
    
    const vitrineProds = prods.filter(p => p.estoque_central > 0);
    
    return <Storefront initialProdutos={vitrineProds} initialConfiguracao={config} />;
  } catch (error) {
    console.error("Erro no SSR ao carregar vitrine:", error);
    // Em caso de falha no Firebase SSR, renderiza com arrays vazios
    return <Storefront initialProdutos={[]} initialConfiguracao={null} />;
  }
}
