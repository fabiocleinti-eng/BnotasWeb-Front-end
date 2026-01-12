# Correção: Erro usuario_id no Backend

## 🔴 Problema

Ao tentar criar uma nota, o backend retorna o erro:
```
Field 'usuario_id' doesn't have a default value
```

O SQL gerado mostra que o campo `usuario_id` não está sendo incluído no INSERT:
```sql
insert into `anotacao` (`conteudo`, `cor`, `dataCriacao`, ...) 
-- FALTA: usuario_id
```

## 🔍 Causa

O controller está tentando usar `req.user.id`, mas provavelmente:
1. O middleware de autenticação não está populando `req.user`
2. Ou o campo no banco está como `usuario_id` mas o modelo usa `userId`

## ✅ Solução

### 1. Verificar o Middleware de Autenticação

No arquivo do backend (ex: `src/middleware/auth.middleware.ts` ou similar), certifique-se de que está populando `req.user`:

```typescript
// Exemplo de middleware
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: { message: 'Token não fornecido' } });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'seu-secret', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: { message: 'Token inválido' } });
    }
    
    // IMPORTANTE: Popular req.user
    req.user = user; // ou req.user = { id: user.userId, email: user.email }
    next();
  });
};
```

### 2. Verificar o Controller de Notas

No arquivo `src/controllers/notes.controller.ts` (ou similar), certifique-se de que está usando `req.user.id`:

```typescript
async create(req: Request, res: Response) {
  try {
    // VERIFICAR: req.user existe?
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: { message: 'Usuário não autenticado' } });
    }

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
      userId: req.user.id  // ← GARANTIR QUE ESTÁ AQUI
    });

    const noteData = note.toJSON();
    if (noteData.senha) {
      noteData.senha = '***';
    }

    res.status(201).json(noteData);
  } catch (error) {
    console.error('Erro ao criar nota:', error);
    res.status(500).json({ error: { message: 'Erro ao criar nota' } });
  }
}
```

### 3. Verificar o Modelo Sequelize

No arquivo do modelo (ex: `src/models/Note.ts`), verifique se o campo está mapeado corretamente:

```typescript
// Se o banco usa 'usuario_id' mas o modelo usa 'userId'
userId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'usuario_id',  // ← Mapear para o nome da coluna no banco
  references: {
    model: 'Users',
    key: 'id'
  }
}
```

OU se o modelo já usa `usuario_id`:

```typescript
usuario_id: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: 'Users',
    key: 'id'
  }
}
```

E no create:
```typescript
const note = await Note.create({
  // ... outros campos
  usuario_id: req.user.id  // ← Usar o nome correto
});
```

### 4. Verificar as Rotas

Certifique-se de que o middleware está sendo aplicado:

```typescript
import { authenticateToken } from '../middleware/auth.middleware';
import notesController from '../controllers/notes.controller';

router.post('/', authenticateToken, notesController.create.bind(notesController));
// OU
router.use(authenticateToken); // Aplicar a todas as rotas
router.post('/', notesController.create.bind(notesController));
```

## 🧪 Teste Rápido

Adicione um log temporário no controller para debugar:

```typescript
async create(req: Request, res: Response) {
  console.log('=== DEBUG CREATE NOTE ===');
  console.log('req.user:', req.user);
  console.log('req.user?.id:', req.user?.id);
  console.log('req.body:', req.body);
  
  // ... resto do código
}
```

Se `req.user` for `undefined`, o problema está no middleware de autenticação.

## 📝 Checklist

- [ ] Middleware de autenticação está populando `req.user`
- [ ] Controller está verificando se `req.user` existe
- [ ] Controller está usando `req.user.id` no create
- [ ] Rotas estão usando o middleware `authenticateToken`
- [ ] Nome do campo no modelo corresponde ao banco (`userId` vs `usuario_id`)
- [ ] Token está sendo enviado no header `Authorization: Bearer <token>`

## 🔧 Solução Temporária (Apenas para Teste)

Se precisar testar rapidamente, pode adicionar um fallback (NÃO USE EM PRODUÇÃO):

```typescript
const note = await Note.create({
  // ... outros campos
  userId: req.user?.id || 1  // ← FALLBACK PERIGOSO, apenas para teste
});
```

Mas o correto é corrigir o middleware de autenticação!

