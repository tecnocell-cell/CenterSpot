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

## Início rápido (Windows)

1. Configure MySQL e importe o banco conforme `docs/`.
2. Copie `hotspot/backend/.env.example` para `hotspot/backend/.env` e ajuste.
3. Instale dependências:
   ```powershell
   cd hotspot/backend; npm install
   cd ../frontend; npm install
   ```
4. Inicie com `.\start-local.ps1` ou manualmente backend + frontend.
5. Painel: http://localhost:5173

## Licença

Uso privado — Center Tech / Tecnocell.
