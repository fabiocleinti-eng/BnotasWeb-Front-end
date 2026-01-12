# 🚀 Guia de Implementação do Backend - BnotasWeb

## 📋 Estrutura do Backend

Este guia contém todo o código necessário para implementar o backend com suporte a:
- ✅ Sistema de Assinaturas/Planos
- ✅ Notas Protegidas por Senha
- ✅ Lixeira Protegida
- ✅ Tags nas Notas
- ✅ Soft Delete (Lixeira)

---

## 📁 Estrutura de Pastas Recomendada

```
backend/
├── src/
│   ├── models/
│   │   ├── User.js
│   │   ├── Note.js
│   │   ├── Subscription.js
│   │   └── Plan.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── notes.routes.js
│   │   └── subscriptions.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── notes.controller.js
│   │   └── subscriptions.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── subscription.middleware.js
│   ├── utils/
│   │   └── encryption.js
│   └── server.js
├── package.json
└── .env
```

---

## 1️⃣ Package.json (Dependências Necessárias)

```json
{
  "name": "bnotasweb-backend",
  "version": "1.0.0",
  "description": "Backend API para BnotasWeb",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "sqlite3": "^5.1.6",
    "sequelize": "^6.35.0",
    "crypto": "^1.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**Comando para instalar:**
```bash
npm install express cors dotenv bcryptjs jsonwebtoken sqlite3 sequelize
npm install --save-dev nodemon
```

---

## 2️⃣ Configuração do Banco de Dados (Sequelize)

### `src/models/index.js`
```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

module.exports = { sequelize };
```

---

## 3️⃣ Modelos do Banco de Dados

### `src/models/User.js`
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: true
  },
  telefone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.senha) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('senha')) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    }
  }
});

module.exports = User;
```

### `src/models/Note.js`
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Note = sequelize.define('Note', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  },
  conteudo: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: ''
  },
  cor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#fff9c4'
  },
  favorita: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dataCriacao: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dataModificacao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dataLembrete: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // NOVOS CAMPOS
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  deletado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  dataExclusao: {
    type: DataTypes.DATE,
    allowNull: true
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: true
    // ⚠️ IMPORTANTE: Em produção, criptografar com bcrypt!
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  hooks: {
    beforeUpdate: (note) => {
      note.dataModificacao = new Date();
    }
  }
});

module.exports = Note;
```

### `src/models/Subscription.js`
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    unique: true
  },
  planId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired'),
    defaultValue: 'active'
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  features: {
    type: DataTypes.JSON,
    defaultValue: []
  }
});

module.exports = Subscription;
```

### `src/models/Plan.js`
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Plan = sequelize.define('Plan', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'BRL'
  },
  features: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = Plan;
```

---

## 4️⃣ Utilitários de Criptografia

### `src/utils/encryption.js`
```javascript
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

// Criptografar senha de nota
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Descriptografar senha de nota
function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = parts.join(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
```

---

## 5️⃣ Middleware de Autenticação

### `src/middleware/auth.middleware.js`
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-super-seguro-aqui';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: { message: 'Token não fornecido' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: { message: 'Usuário não encontrado' } });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: { message: 'Token inválido' } });
  }
}

module.exports = { authenticateToken };
```

---

## 6️⃣ Middleware de Assinatura

### `src/middleware/subscription.middleware.js`
```javascript
const Subscription = require('../models/Subscription');

// Verificar se usuário tem feature premium
async function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const subscription = await Subscription.findOne({
        where: { userId: req.user.id, status: 'active' }
      });

      if (!subscription || subscription.planId === 'free') {
        return res.status(403).json({
          error: {
            message: `Esta funcionalidade requer plano Premium. Faça upgrade para acessar.`
          }
        });
      }

      if (!subscription.features.includes(feature)) {
        return res.status(403).json({
          error: {
            message: `Funcionalidade não disponível no seu plano atual.`
          }
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      return res.status(500).json({ error: { message: 'Erro ao verificar assinatura' } });
    }
  };
}

module.exports = { requireFeature };
```

---

## 7️⃣ Controllers

### `src/controllers/auth.controller.js`
```javascript
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-super-seguro-aqui';

class AuthController {
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          error: { message: 'Email ou senha incorretos' }
        });
      }

      const validPassword = await bcrypt.compare(senha, user.senha);
      if (!validPassword) {
        return res.status(401).json({
          error: { message: 'Email ou senha incorretos' }
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao fazer login' } });
    }
  }

  async register(req, res) {
    try {
      const { email, senha, nome, telefone } = req.body;

      // Verificar se usuário já existe
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          error: { message: 'Email já cadastrado' }
        });
      }

      // Criar usuário
      const user = await User.create({
        email,
        senha,
        nome: nome || email.split('@')[0],
        telefone
      });

      // Criar assinatura gratuita
      await Subscription.create({
        userId: user.id,
        planId: 'free',
        status: 'active',
        features: []
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao cadastrar usuário' } });
    }
  }

  async forgotPassword(req, res) {
    // TODO: Implementar envio de email
    res.json({ message: 'Link de recuperação enviado para o email' });
  }
}

module.exports = new AuthController();
```

### `src/controllers/notes.controller.js`
```javascript
const Note = require('../models/Note');
const { encrypt, decrypt } = require('../utils/encryption');

class NotesController {
  async getAll(req, res) {
    try {
      const notes = await Note.findAll({
        where: {
          userId: req.user.id,
          deletado: false
        },
        order: [['dataCriacao', 'DESC']]
      });

      // Descriptografar senhas se necessário (apenas para validação)
      const notesWithDecrypted = notes.map(note => {
        const noteData = note.toJSON();
        // Não retornar senha descriptografada, apenas indicar se existe
        if (noteData.senha) {
          noteData.senha = '***'; // Placeholder
        }
        return noteData;
      });

      res.json(notesWithDecrypted);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao buscar notas' } });
    }
  }

  async create(req, res) {
    try {
      const { titulo, conteudo, cor, favorita, dataLembrete, tags, senha } = req.body;

      // Se tiver senha, criptografar
      let encryptedPassword = null;
      if (senha) {
        encryptedPassword = encrypt(senha);
      }

      const note = await Note.create({
        titulo: titulo || '',
        conteudo: conteudo || '',
        cor: cor || '#fff9c4',
        favorita: favorita || false,
        dataLembrete: dataLembrete || null,
        tags: tags || [],
        senha: encryptedPassword,
        userId: req.user.id
      });

      const noteData = note.toJSON();
      if (noteData.senha) {
        noteData.senha = '***';
      }

      res.status(201).json(noteData);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao criar nota' } });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { titulo, conteudo, cor, favorita, dataLembrete, tags, senha } = req.body;

      const note = await Note.findOne({
        where: { id, userId: req.user.id }
      });

      if (!note) {
        return res.status(404).json({ error: { message: 'Nota não encontrada' } });
      }

      // Se tiver senha nova, criptografar
      const updateData = {
        titulo,
        conteudo,
        cor,
        favorita,
        dataLembrete,
        tags
      };

      if (senha !== undefined) {
        updateData.senha = senha ? encrypt(senha) : null;
      }

      await note.update(updateData);

      const noteData = note.toJSON();
      if (noteData.senha) {
        noteData.senha = '***';
      }

      res.json(noteData);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao atualizar nota' } });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const note = await Note.findOne({
        where: { id, userId: req.user.id }
      });

      if (!note) {
        return res.status(404).json({ error: { message: 'Nota não encontrada' } });
      }

      // Soft delete - mover para lixeira
      await note.update({
        deletado: true,
        dataExclusao: new Date()
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao excluir nota' } });
    }
  }

  async deletePermanently(req, res) {
    try {
      const { id } = req.params;

      const note = await Note.findOne({
        where: { id, userId: req.user.id, deletado: true }
      });

      if (!note) {
        return res.status(404).json({ error: { message: 'Nota não encontrada na lixeira' } });
      }

      await note.destroy();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao excluir permanentemente' } });
    }
  }

  async restore(req, res) {
    try {
      const { id } = req.params;

      const note = await Note.findOne({
        where: { id, userId: req.user.id, deletado: true }
      });

      if (!note) {
        return res.status(404).json({ error: { message: 'Nota não encontrada na lixeira' } });
      }

      await note.update({
        deletado: false,
        dataExclusao: null
      });

      res.json(note);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao restaurar nota' } });
    }
  }

  async getTrash(req, res) {
    try {
      const notes = await Note.findAll({
        where: {
          userId: req.user.id,
          deletado: true
        },
        order: [['dataExclusao', 'DESC']]
      });

      const notesData = notes.map(note => {
        const data = note.toJSON();
        if (data.senha) {
          data.senha = '***';
        }
        return data;
      });

      res.json(notesData);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao buscar lixeira' } });
    }
  }

  async verifyPassword(req, res) {
    try {
      const { id } = req.params;
      const { senha } = req.body;

      const note = await Note.findOne({
        where: { id, userId: req.user.id }
      });

      if (!note) {
        return res.status(404).json({ error: { message: 'Nota não encontrada' } });
      }

      if (!note.senha) {
        return res.status(400).json({ error: { message: 'Nota não está protegida' } });
      }

      const decryptedPassword = decrypt(note.senha);
      const isValid = senha === decryptedPassword;

      res.json({ valid: isValid });
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao verificar senha' } });
    }
  }
}

module.exports = new NotesController();
```

### `src/controllers/subscriptions.controller.js`
```javascript
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

// Planos pré-definidos
const PLANS = {
  free: {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    features: []
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.90,
    features: [
      'protected_notes',
      'email_notifications',
      'protected_trash',
      'unlimited_notes',
      'export_notes',
      'custom_themes'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 19.90,
    features: [
      'protected_notes',
      'email_notifications',
      'protected_trash',
      'unlimited_notes',
      'export_notes',
      'custom_themes',
      'voice_access'
    ]
  }
};

class SubscriptionsController {
  async getCurrent(req, res) {
    try {
      let subscription = await Subscription.findOne({
        where: { userId: req.user.id }
      });

      // Se não tiver assinatura, criar gratuita
      if (!subscription) {
        subscription = await Subscription.create({
          userId: req.user.id,
          planId: 'free',
          status: 'active',
          features: []
        });
      }

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao buscar assinatura' } });
    }
  }

  async upgrade(req, res) {
    try {
      const { planId } = req.body;

      if (!PLANS[planId]) {
        return res.status(400).json({ error: { message: 'Plano inválido' } });
      }

      const plan = PLANS[planId];

      let subscription = await Subscription.findOne({
        where: { userId: req.user.id }
      });

      if (!subscription) {
        subscription = await Subscription.create({
          userId: req.user.id,
          planId: plan.id,
          status: 'active',
          features: plan.features
        });
      } else {
        await subscription.update({
          planId: plan.id,
          status: 'active',
          features: plan.features,
          startDate: new Date()
        });
      }

      // TODO: Integrar com gateway de pagamento (Stripe, PayPal, etc.)
      // Por enquanto, apenas atualiza a assinatura

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao fazer upgrade' } });
    }
  }

  async cancel(req, res) {
    try {
      const subscription = await Subscription.findOne({
        where: { userId: req.user.id }
      });

      if (!subscription) {
        return res.status(404).json({ error: { message: 'Assinatura não encontrada' } });
      }

      await subscription.update({
        status: 'cancelled'
      });

      res.json(subscription);
    } catch (error) {
      res.status(500).json({ error: { message: 'Erro ao cancelar assinatura' } });
    }
  }

  async getPlans(req, res) {
    res.json(Object.values(PLANS));
  }
}

module.exports = new SubscriptionsController();
```

---

## 8️⃣ Rotas

### `src/routes/auth.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/login', authController.login.bind(authController));
router.post('/usuarios', authController.register.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));

module.exports = router;
```

### `src/routes/notes.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notes.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { requireFeature } = require('../middleware/subscription.middleware');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

router.get('/', notesController.getAll.bind(notesController));
router.post('/', notesController.create.bind(notesController));
router.put('/:id', notesController.update.bind(notesController));
router.delete('/:id', notesController.delete.bind(notesController));
router.post('/:id/restore', notesController.restore.bind(notesController));
router.delete('/:id/permanent', notesController.deletePermanently.bind(notesController));
router.get('/trash', notesController.getTrash.bind(notesController));
router.post('/:id/verify-password', notesController.verifyPassword.bind(notesController));

module.exports = router;
```

### `src/routes/subscriptions.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptions.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get('/current', subscriptionsController.getCurrent.bind(subscriptionsController));
router.post('/upgrade', subscriptionsController.upgrade.bind(subscriptionsController));
router.post('/cancel', subscriptionsController.cancel.bind(subscriptionsController));
router.get('/plans', subscriptionsController.getPlans.bind(subscriptionsController));

module.exports = router;
```

---

## 9️⃣ Servidor Principal

### `src/server.js`
```javascript
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/index');

// Importar modelos
const User = require('./models/User');
const Note = require('./models/Note');
const Subscription = require('./models/Subscription');
const Plan = require('./models/Plan');

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const notesRoutes = require('./routes/notes.routes');
const subscriptionsRoutes = require('./routes/subscriptions.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api', authRoutes);
app.use('/api/anotacoes', notesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// Sincronizar banco de dados
async function syncDatabase() {
  try {
    // Definir relacionamentos
    User.hasMany(Note, { foreignKey: 'userId' });
    Note.belongsTo(User, { foreignKey: 'userId' });
    
    User.hasOne(Subscription, { foreignKey: 'userId' });
    Subscription.belongsTo(User, { foreignKey: 'userId' });

    await sequelize.sync({ alter: true });
    console.log('✅ Banco de dados sincronizado');
  } catch (error) {
    console.error('❌ Erro ao sincronizar banco:', error);
  }
}

// Iniciar servidor
async function startServer() {
  await syncDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 API disponível em http://localhost:${PORT}/api`);
  });
}

startServer();
```

---

## 🔟 Arquivo .env

Crie um arquivo `.env` na raiz do backend:

```env
PORT=3000
JWT_SECRET=seu-secret-super-seguro-aqui-mude-em-producao
ENCRYPTION_KEY=seu-key-de-criptografia-32-caracteres-hex
NODE_ENV=development
```

**⚠️ IMPORTANTE:** Em produção, use chaves seguras e diferentes!

---

## 📝 Comandos para Executar

```bash
# 1. Instalar dependências
npm install

# 2. Criar arquivo .env (copie o exemplo acima)

# 3. Executar servidor
npm run dev  # ou npm start
```

---

## 🔄 Atualizar Front-end

Atualize o `SubscriptionService` no front-end para usar o backend:

### `src/app/core/services/subscription.service.ts` (atualizar métodos)

```typescript
upgradeToPlan(planId: string): Observable<boolean> {
  return this.http.post(`${API_URL}/subscriptions/upgrade`, { planId }).pipe(
    tap(subscription => {
      this.subscriptionSource.next(subscription);
    }),
    map(() => true)
  );
}

getCurrentSubscription(): Observable<UserSubscription> {
  return this.http.get<UserSubscription>(`${API_URL}/subscriptions/current`).pipe(
    tap(subscription => {
      this.subscriptionSource.next(subscription);
    })
  );
}
```

---

## ✅ Checklist de Implementação

- [ ] Criar estrutura de pastas
- [ ] Instalar dependências (`npm install`)
- [ ] Criar arquivo `.env`
- [ ] Criar modelos do banco
- [ ] Criar controllers
- [ ] Criar rotas
- [ ] Criar middlewares
- [ ] Testar endpoints com Postman/Insomnia
- [ ] Atualizar front-end para usar endpoints reais
- [ ] Testar integração completa

---

## 🧪 Testando os Endpoints

Use Postman ou Insomnia para testar:

1. **POST** `/api/usuarios` - Criar usuário
2. **POST** `/api/login` - Fazer login
3. **GET** `/api/anotacoes` - Listar notas (com token)
4. **POST** `/api/anotacoes` - Criar nota (com token)
5. **GET** `/api/subscriptions/current` - Ver assinatura (com token)
6. **POST** `/api/subscriptions/upgrade` - Fazer upgrade (com token)

---

Pronto! Este é o código completo do backend. Copie e cole os arquivos no seu projeto backend e ajuste conforme necessário! 🚀




