# 🚀 Passo a Passo - Implementação do Backend

## 📋 O que você precisa fazer:

### **Opção 1: Você mesmo implementa (Recomendado)**
1. Abra o Cursor no projeto do backend
2. Copie e cole os arquivos do guia `BACKEND_IMPLEMENTATION_GUIDE.md`
3. Siga a estrutura de pastas sugerida
4. Execute `npm install` para instalar dependências
5. Crie o arquivo `.env` com as chaves
6. Execute `npm run dev` para iniciar

### **Opção 2: Eu crio os arquivos aqui (se o backend estiver no mesmo workspace)**
Se o backend estiver na mesma pasta ou workspace, posso criar os arquivos diretamente.

---

## ✅ Checklist Rápido:

### 1. Estrutura de Pastas
```
backend/
├── src/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── utils/
│   └── server.js
├── package.json
└── .env
```

### 2. Dependências (package.json)
```bash
npm install express cors dotenv bcryptjs jsonwebtoken sqlite3 sequelize
npm install --save-dev nodemon
```

### 3. Arquivo .env
```env
PORT=3000
JWT_SECRET=seu-secret-super-seguro-aqui
ENCRYPTION_KEY=seu-key-de-criptografia-32-caracteres-hex
```

### 4. Endpoints Principais

**Autenticação:**
- `POST /api/login` - Login
- `POST /api/usuarios` - Cadastro
- `POST /api/forgot-password` - Recuperar senha

**Notas:**
- `GET /api/anotacoes` - Listar notas
- `POST /api/anotacoes` - Criar nota
- `PUT /api/anotacoes/:id` - Atualizar nota
- `DELETE /api/anotacoes/:id` - Mover para lixeira
- `GET /api/anotacoes/trash` - Listar lixeira
- `POST /api/anotacoes/:id/restore` - Restaurar nota
- `POST /api/anotacoes/:id/verify-password` - Verificar senha

**Assinaturas:**
- `GET /api/subscriptions/current` - Assinatura atual
- `POST /api/subscriptions/upgrade` - Fazer upgrade
- `POST /api/subscriptions/cancel` - Cancelar
- `GET /api/subscriptions/plans` - Listar planos

---

## 🔧 O que já está pronto no Front-end:

✅ `SubscriptionService` atualizado para usar backend
✅ Fallback para localStorage se backend não estiver disponível
✅ Integração com endpoints de assinaturas
✅ Tratamento de erros

---

## 🧪 Como Testar:

1. **Inicie o backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Inicie o front-end:**
   ```bash
   npm start
   ```

3. **Teste no navegador:**
   - Faça login
   - Acesse Configurações > Planos
   - Tente fazer upgrade
   - Verifique se a assinatura é salva no backend

---

## ⚠️ Importante:

1. **Segurança:**
   - Em produção, use chaves JWT e ENCRYPTION_KEY fortes
   - Criptografe senhas de notas com bcrypt (não apenas AES)
   - Use HTTPS em produção

2. **Banco de Dados:**
   - SQLite é para desenvolvimento
   - Em produção, use PostgreSQL ou MySQL
   - Configure backups automáticos

3. **Pagamentos:**
   - Integre com Stripe, PayPal ou Mercado Pago
   - Configure webhooks para atualizar assinaturas
   - Valide pagamentos no backend

---

## 📞 Próximos Passos Após Implementar:

1. Testar todos os endpoints
2. Integrar gateway de pagamento
3. Configurar envio de emails
4. Adicionar logs e monitoramento
5. Configurar CI/CD

---

**Dúvidas?** Me avise e eu ajudo! 🚀




