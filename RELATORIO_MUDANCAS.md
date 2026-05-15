# Relatório de Alterações - FlowGuard

Este relatório descreve todas as correções e melhorias implementadas no sistema FlowGuard.

## 1. Correção de Rotas e Páginas
Foram criadas todas as rotas faltantes para garantir que o menu lateral não exiba erros de "Not Found".
- **Novas Rotas:** Análise, Eventos, Mitigação (Ativas, FlowSpec, BGP, Whitelist, Blacklist), CDNs, Operação (Coletores, Sessões BGP, Limiares), Sistema, Auditoria, Notificações e Configurações.
- **Novas Páginas:** Placeholder para todas as rotas com visual padronizado e tradução automática.

## 2. Integração de Dados do Dashboard
O dashboard agora busca dados reais da API utilizando `@tanstack/react-query`.
- **Endpoints Integrados:** 
  - `/api/detection/stats` (Métricas principais)
  - `/api/flows/timeline` (Gráfico de tráfego)
  - `/api/flows/protocols` (Top Protocolos)
  - `/api/flows/countries` (Top Países)
  - `/api/flows/ports` (Top Portas)
  - `/api/collectors/1/interfaces/summary` (Interfaces SNMP)
  - `/api/flows/summary` (Resumo geral)
- **Atualização Automática:** Todos os dados são atualizados a cada 30 segundos.

## 3. Redesign Completo (UI/UX)
O sistema foi totalmente refatorado com um design profissional.
- **Login:** Novo layout com card centralizado, logo FlowGuard e seletor de idioma.
- **Sidebar:** Agora é colapsável, com grupos organizados ("Mitigação" e "Operação") e ícones modernos.
- **Header:** Altura reduzida para 52px, botões de toggle, seletor de idioma e avatar de usuário.
- **Dashboard:** Cards de métricas com tendências, gráficos de área polidos (Recharts) e tabelas com hover e destaque para linhas suspeitas.

## 4. Gerenciamento de Temas (Dark/Light Mode)
- Implementado `ThemeContext` para gerenciar a troca de tema globalmente.
- Sincronização automática com `localStorage` e preferência do sistema.
- Cores customizadas via Tailwind v4 garantindo visibilidade total em ambos os modos.

## 5. Internacionalização (i18n)
- Arquivo `translations.ts` atualizado com todas as novas chaves.
- Suporte completo a Português, Inglês e Espanhol em todas as telas e menus.

## 6. Correções Técnicas
- Substituição de `window.location.href` por `navigate` do TanStack Router para navegação sem refresh.
- Centralização do estado da Sidebar via `UIContext`.
 - Padronização dos componentes `Skeleton` para carregamento suave.
 
 ## 7. Correção Crítica de Segurança e API
 - **Remoção de Token em Autenticação:** Corrigido o interceptor de requisições no arquivo `src/services/api.ts` para não enviar o cabeçalho `Authorization` durante o login e refresh de token, evitando erros de credenciais inválidas caso existisse um token expirado no cache.
 - **Tratamento de Erros de Login:** Implementada a limpeza de estados de erro ao digitar no formulário de login e tratamento refinado para respostas 401.
 - **Renovação de Token (Refresh Token):** Implementada lógica no interceptor da API para tentar renovar o token automaticamente antes de deslogar o usuário em caso de erro 401, evitando loops de redirecionamento.
 - **Persistência de Sessão Síncrona:** O estado de autenticação agora é lido do `localStorage` instantaneamente na inicialização, eliminando "flickers" e garantindo que rotas protegidas funcionem corretamente.