# Recuperação de senha do Minha Estante

O código implementa tokens aleatórios de 256 bits, armazenados como SHA-256, com uso único, expiração em 30 minutos e limite de três solicitações por usuário a cada hora. Senhas são armazenadas com bcrypt.

## Configuração obrigatória na Vercel
Adicionar, na(s) ambiente(s) em que esta função será usada:
- RESEND_API_KEY: chave do serviço de e-mails Resend.
- RESET_EMAIL_FROM: remetente de domínio verificado no Resend (por exemplo, Minha Estante <contato@DOMINIO_VERIFICADO>).
- APP_BASE_URL: domínio HTTPS fixo e legítimo do aplicativo, que não exige login da Vercel para o destinatário acessar o link.

Sem essas variáveis, a API retorna 503 de forma explícita e não envia e-mails. Não colocar segredos no GitHub.

## Banco de dados
Executar a migração SQL em um banco de testes antes de produção (ver prisma/migrations/20261029_password_reset/migration.sql). A aplicação usa Prisma.

## Segurança
- Não ativar links de recuperação que conduzam ao domínio sinalizado pelo Google Safe Browsing até investigação e correção.
- Não marcar um endereço como seguro manualmente no Chrome; pedir revisão por canais oficiais se a classificação for indevida.
- Revisar a invalidação de sessões existentes após a troca de senha, caso seja exigido encerramento de todos os dispositivos.
- A interface de recuperação não depende da senha antiga.
