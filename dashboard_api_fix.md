 # Relatório de Correção - Dashboard API
 
 ## Problema Identificado
 Os componentes de **Protocolos**, **Países** e **Portas** no Dashboard estavam aparecendo vazios, apesar das chamadas à API estarem sendo realizadas com sucesso. Isso indicava uma incompatibilidade entre a estrutura de dados retornada pela API e a forma como o frontend estava acessando esses dados.
 
 ## Alterações Realizadas
 
 ### 1. Diagnóstico por Logs
 Adicionados `console.log` em cada query do `useQuery` para inspecionar a resposta bruta da API diretamente no console do navegador (F12).
 - `protocols raw`
 - `countries raw`
 - `ports raw`
 - `connections raw`
 
 ### 2. Acesso Robusto aos Dados
 A lógica de processamento foi atualizada para tentar acessar os itens em diferentes estruturas possíveis que a API costuma retornar:
 - Tenta `data.items`
 - Se não existir, tenta `data.data`
 - Se for um array direto, utiliza o próprio objeto
 - Fallback para array vazio `[]`
 
 ### 3. Padronização das Queries
 As chamadas ao `api.get` foram padronizadas para garantir que o retorno seja sempre o objeto de dados da resposta, facilitando o tratamento posterior.
 
 ## Como Verificar
 1. Abra o Dashboard.
 2. Pressione `F12` e vá para a aba **Console**.
 3. Verifique as mensagens "raw" para entender a estrutura exata que vem do servidor.
 4. Os componentes agora devem renderizar os dados corretamente se estiverem presentes em `items`, `data` ou na raiz da resposta.