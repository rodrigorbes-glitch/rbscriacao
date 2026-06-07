import { Metadata } from 'next';
import ProdutoClient from './ProdutoClient';
import { produtosAPI } from '@/services/api';

type Props = {
  params: { id: string }
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const id = params.id;
  
  try {
    const produto = await produtosAPI.getById(id);
    
    if (!produto) {
      return {
        title: 'Produto não encontrado | RBS Criação',
      }
    }

    const title = `${produto.nome} | RBS Criação`;
    const description = produto.descricao || `Compre ${produto.nome} na RBS Criação.`;
    const imageUrl = produto.foto_url || 'https://www.rbscriacao.com/icons/icon-512x512.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.rbscriacao.com/produto/${id}`,
        siteName: 'RBS Criação',
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: produto.nome,
          },
        ],
        locale: 'pt_BR',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    }
  } catch (error) {
    return {
      title: 'Produto | RBS Criação',
    }
  }
}

export default function ProdutoPage() {
  return <ProdutoClient />;
}
