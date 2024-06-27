const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { engine } = require('express-handlebars');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs');
const axios = require('axios');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Product = require('./models/produto')
// const user = require('./models/user')
const UserAdm = require('./models/userAdm')
const algorithm = 'aes-256-cbc';
const secretKey = crypto.randomBytes(32).toString('hex'); // Gera uma chave secreta segura
const iv = crypto.randomBytes(16);

const app = express();
app.use(session({
    secret: 'admin123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 2* 60 * 1000 }
}));

console.log('Generated secret key:', secretKey);
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.engine('handlebars', engine({
    defaultLayout: 'main',
    runtimeOptions: {
        allowProtoPropertiesByDefault: true,
        allowProtoMethodsByDefault: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware to reset session timer on user activity
app.use((req, res, next) => {
    if (req.session) {
        req.session._garbage = Date();
        req.session.touch();
    }
    next();
});

passport.use(new LocalStrategy((username, password, done) => {
    UserAdm.findOne({ where: { username } })
        .then(user => {
            if (!user) {
                return done(null, false, { message: 'Credenciais inválidas' });
            }
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Credenciais inválidas' });
                }
            });
        })
        .catch(err => {
            return done(err);
        });
}));


passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    UserAdm.findByPk(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err, null);
        });
});

const uploadDir = 'public/img';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

function encryptImage(filePath) {
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(filePath + '.enc');

    input.pipe(cipher).pipe(output);

    return new Promise((resolve, reject) => {
        output.on('finish', () => {
            fs.unlink(filePath, (err) => {
                if (err) reject(err);
                resolve(filePath + '.enc');
            });
        });
    });
}

function decryptImage(filePath, outputFilePath) {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'hex'), iv);
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(outputFilePath);

    input.pipe(decipher).pipe(output);

    return new Promise((resolve, reject) => {
        output.on('finish', () => {
            resolve(outputFilePath);
        });
    });
}

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    console.log('Usuário não autenticado, redirecionando para /login');
    res.redirect('/login');
}

app.get('/login', (req, res) => {
    res.render('login', { title: 'Login' });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/cadastro-de-produtos',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

app.get('/cadastro-de-produtos', isAuthenticated, (req, res) => {
    Product.findAll()
        .then(products => {
            const plainProducts = products.map(product => product.get({ plain: true }));
            res.render('add-product', { products: plainProducts });
        })
        .catch(err => {
            console.error('Erro ao buscar produtos:', err);
            res.status(500).send('Erro interno do servidor');
        });
});

app.post('/cadastro-de-produtos', isAuthenticated, upload.single('image'), (req, res) => {
    const { name, description, price } = req.body;
    const imageUrl = req.file ? '/img/' + req.file.filename : null;

    Product.create({ name, description, price, imageUrl })
        .then(() => {
            return Product.findAll();
        })
        .then(products => {
            const plainProducts = products.map(product => product.get({ plain: true }));
            res.render('add-product', { products: plainProducts });
        })
        .catch(err => {
            console.error('Erro ao cadastrar o produto:', err);
            res.render('add-product', { error: 'Erro ao cadastrar o produto. Por favor, tente novamente.' });
        });
});

app.get('/editar-produto/:id', isAuthenticated, (req, res) => {
    Product.findByPk(req.params.id)
        .then(product => {
            if (product) {
                res.render('edit-product', { product: product.get({ plain: true }) });
            } else {
                res.redirect('/cadastro-de-produtos');
            }
        })
        .catch(err => {
            console.error('Erro ao buscar produto:', err);
            res.redirect('/cadastro-de-produtos');
        });
});

app.post('/editar-produto/:id', isAuthenticated, upload.single('image'), (req, res) => {
    const { name, description, price } = req.body;
    const imageUrl = req.file ? '/img/' + req.file.filename : null;

    Product.findByPk(req.params.id)
        .then(product => {
            if (product) {
                product.name = name;
                product.description = description;
                product.price = price;
                if (imageUrl) {
                    product.imageUrl = imageUrl;
                }
                return product.save();
            }
        })
        .then(() => {
            res.redirect('/cadastro-de-produtos');
        })
        .catch(err => {
            console.error('Erro ao editar o produto:', err);
            res.redirect('/cadastro-de-produtos');
        });
});

app.post('/deletar-produto/:id', isAuthenticated, (req, res) => {
    Product.findByPk(req.params.id)
        .then(product => {
            if (product) {
                return product.destroy();
            }
        })
        .then(() => {
            res.redirect('/cadastro-de-produtos');
        })
        .catch(err => {
            console.error('Erro ao deletar o produto:', err);
            res.redirect('/cadastro-de-produtos');
        });
});

app.post('/user', (req, res) => {
    const { email, password } = req.body;
    if (email === 'user@example.com' && password === 'password') {
        res.status(200).send('Login realizado com sucesso');
    } else {
        res.status(401).send('Email ou senha inválidos');
    }
});

app.get('/register', (req, res) => {
    res.render('register', { title: 'Cadastro' });
});

app.post('/register', (req, res) => {
    const { email } = req.body;
    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'seu-email@gmail.com',
            pass: 'sua-senha'
        }
    });

    let mailOptions = {
        from: 'seu-email@gmail.com',
        to: email,
        subject: 'Confirmação de Cadastro',
        text: 'Obrigado por se cadastrar! Por favor, confirme seu email clicando no link abaixo.',
        html: '<b>Obrigado por se cadastrar!</b><br>Por favor, confirme seu email clicando no link abaixo.<br><a href="http://seusite.com/confirmar-email">Confirmar Email</a>'
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).send(error.toString());
        }
        res.status(200).send('Email de confirmação enviado');
    });
});

app.get('/produtos', (req, res) => {
    Product.findAll({
        attributes: ['id', 'name', 'description', 'price', 'imageUrl', 'createdAt', 'updatedAt']
    })
    .then(products => {
        const plainProducts = products.map(product => product.get({ plain: true }));
        console.log('Produtos recuperados:', plainProducts);
        res.render('produtos', { products: plainProducts });
    })
    .catch(err => {
        console.error('Erro ao buscar produtos:', err);
        res.status(500).send('Erro interno do servidor');
    });
});

// Adicionando a rota para verificar a autenticação
app.get('/check-auth', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ isAuthenticated: true });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// Adicionando a rota finalizada protegida
app.get('/finalizar', isAuthenticated, (req, res) => {
    res.render('finalizar', { title: 'Finalizar Compra' });
});

app.post('/calcular-frete', (req, res) => {
    const { cep } = req.body;
    const url = `http://calcularfrete.pythonanywhere.com/calcular-frete?peso=10&cep_origem=41620620&cep_destino=${cep}`;

    axios.get(url)
        .then(response => {
            res.json(response.data);
        })
        .catch(error => {
            console.error('Erro ao calcular o frete:', error);
            res.status(500).json({ error: 'Erro ao calcular o frete. Por favor, tente novamente mais tarde.' });
        });
});

app.get('/sobre', (req, res) => {
    res.render('sobre');
});

app.get('/contato', (req, res) => {
    res.render('contato');
});

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/obrigado', (req, res) => {
    res.render('obrigado');
});

app.get('/cadastro-de-usuario', (req, res) => {
    res.render('cadastro-usuario');
});

app.get('/beneficios', (req, res) => {
    res.render('beneficios');
});

app.get('/faqs', (req,res)=>{
    res.render('faqs')
})

app.get('/help', (req,res)=>{
    res.render('help')
})

app.get('/support', (req,res)=>{
    res.render('support')
})

app.post('/cadastro-de-usuario', (req, res) => {
    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Erro ao criptografar a senha:', err);
            res.render('cadastro-usuario', { error: 'Erro ao cadastrar usuário. Por favor, tente novamente.' });
        } else {
            UserAdm.create({ username, password: hash })
                .then(() => {
                    res.redirect('/login');
                })
                .catch(err => {
                    console.error('Erro ao cadastrar usuário:', err);
                    res.render('cadastro-usuario', { error: 'Erro ao cadastrar usuário. Por favor, tente novamente.' });
                });
        }
    });
});

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
