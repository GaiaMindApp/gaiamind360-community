# 🌍 GlobalMap 3D - Earth Nullschool Style

Sistema completo de visualização 3D global integrado ao GaiaMind Dashboard.

## 🏗️ Arquitetura Modular

### Componentes Principais

**GlobeScene.tsx**
- Renderização 3D principal com Three.js
- Sistema de partículas para vento
- Diferentes modos de visualização
- Interação com cliques no globo

**CountryLayer.tsx**
- Camada de países e localizações
- Pontos coloridos por tipo (capital, cidade, província, aldeia)
- Integração com dados mundiais

**DataOverlays.tsx**
- Overlays de dados ambientais
- Texturas dinâmicas para temperatura, vegetação, vento
- Animações baseadas no modo ativo

**InfoPanel.tsx**
- Painel lateral com informações detalhadas
- Dados ambientais em tempo real
- Análises do Gaia Mind
- Design minimalista estilo nullschool

**MapControls.tsx**
- Controles de interface
- Seleção de modos de visualização
- Toggle de camadas
- Status e informações

## 🎮 Modos de Visualização

- **🌬️ Wind**: Partículas animadas simulando ventos
- **🌡️ Temperature**: Gradientes de temperatura global
- **🌱 Vegetation**: Índices de vegetação e uso do solo
- **🗺️ Political**: Fronteiras e divisões políticas

## 🔧 Funcionalidades

- ✅ Rotação livre com mouse
- ✅ Zoom com scroll (2.5x - 8x)
- ✅ Clique em regiões para detalhes
- ✅ Controle de camadas ativo/inativo
- ✅ Animações de partículas
- ✅ Dados ambientais simulados
- ✅ Cache local de geodados
- ✅ Fallback para dados offline

## 🌐 Integração de APIs

**Implementadas (simuladas):**
- Natural Earth Data (países e fronteiras)
- GeoNames (cidades e localizações)
- OpenWeatherMap (dados meteorológicos)
- NASA GIBS (imagens de satélite)

**Para produção:**
- Substituir simulações por chamadas reais às APIs
- Implementar autenticação e rate limiting
- Adicionar cache Redis para performance

## 📊 Dados Suportados

- Países por continente
- Capitais, cidades, províncias, aldeias
- Temperatura, vento, umidade
- Emissões de CO₂
- Energia renovável
- Nível do mar

## 🎨 Design

- Estilo Earth Nullschool minimalista
- Cores GaiaMind (azul/verde)
- Animações Framer Motion
- Interface responsiva
- Compatível com WebGL

## 🚀 Performance

- Lazy loading de camadas
- Cache local de 24h
- Otimização de partículas
- Fallback 2D (futuro)
- Geometrias otimizadas