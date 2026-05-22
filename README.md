# CenterSpot

Plataforma SaaS multi-tenant para **Hotspot Captive Portal** e **WhatsApp**, com painel administrativo no padrão visual CenterOS.

## Autor

**Gianderson Fábio J.**  
- E-mail: giandersonfjs@gmail.com  
- Telefone: +55 94 98140-6316  

## Repositório

https://github.com/tecnocell-cell/CenterSpot

## Estrutura

```
Hotspot-WhatsApp/
├── docs/              # Documentação
├── hotspot/
│   ├── backend/       # API Node.js
│   └── frontend/      # React (Vite)
├── install.sh
└── start-local.ps1
```

## Segurança (Git)

**Nunca** faça commit de:

- `hotspot/backend/.env` (use apenas `.env.example` como modelo)
- `mysql-data/`, `cookies.txt`, certificados, tokens, uploads de logos
- Pastas locais: `.claude/`, `.agent/`, `node_modules/`, `dist/`

O `.gitignore` na raiz e em `hotspot/` já bloqueia esses arquivos.

## Início rápido (Windows)

1. Configure MySQL e importe o banco conforme `docs/`.
2. Copie `hotspot/backend/.env.example` para `hotspot/backend/.env` e ajuste (fica só na sua máquina).
3. Instale dependências:
   ```powershell
   cd hotspot/backend; npm install
   cd ../frontend; npm install
   ```
4. Inicie com `.\start-local.ps1` ou manualmente backend + frontend.
5. Painel: http://localhost:5173

## Licença

Uso privado — Center Tech / Tecnocell.
