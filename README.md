# Na Régua Barber Shop

Site estático para GitHub Pages + Supabase, com:
- abertura em tela cheia com as 5 fotos enviadas;
- frase "ESTILO É ATITUDE" antes dos preços/agendamento;
- preços e horários iguais aos do site de referência;
- agendamento;
- limite de 10 agendamentos por dia;
- chat público com atualização em tempo real;
- painel do dono;
- dois e-mails autorizados no painel.

## 1. Supabase

1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `supabase.sql`.
3. Em Authentication > Users, crie:
   - bryanyttcontato@gmail.com
   - naregua@icloud.com
4. Defina a senha desejada para as duas contas no próprio Supabase Auth.
5. Em Project Settings > API, copie a Project URL e a chave `anon public`.
6. Cole as duas informações em `config.js`.

A senha não fica no código do site.

## 2. GitHub Pages

Envie todos os arquivos desta pasta para um repositório GitHub.
Depois vá em Settings > Pages e publique a branch principal na pasta `/root`.

O arquivo `index.html` será a página inicial.

## 3. Fotos

As cinco fotos enviadas estão em `assets/`.

## 4. Importante sobre o limite de vagas

O banco impede duas pessoas de ocupar o mesmo horário simultaneamente. O aplicativo também bloqueia o dia quando chega a 10 agendamentos ativos.

Se você quiser transformar o limite diário em uma regra 100% transacional no banco (sem depender do navegador), crie depois uma função RPC para reservar a vaga de forma atômica.
