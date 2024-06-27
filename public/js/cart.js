$(document).ready(function() {
    var cartItems = JSON.parse(localStorage.getItem('cart')) || [];

    updateCart();

    // Função para atualizar o carrinho na página
    function updateCart() {
        $('#cartItems').empty();

        // Cabeçalho da tabela
        $('#cartItems').append('<tr>' +
            '<th>Produto</th>' +
            '<th>Preço</th>' +
            '<th>Quantidade</th>' +
            '<th>Remover</th>' +
        '</tr>');

        cartItems.forEach(function(item, index) {
            $('#cartItems').append('<tr>' +
                '<td><img src="' + item.imageUrl + '" alt="' + item.name + '" style="width:50px; height:auto; margin-right:5px;"> ' + item.name + '</td>' +
                '<td>R$: ' + item.price + '</td>' +
                '<td>' + item.quantity + 'x</td>' +
                '<td><button class="remove-item" data-index="' + index + '"><i class="fa fa-trash"></i></button></td>' +
            '</tr>');
        });
        updateCartCounter();
        updateTotalPrice();

        // Adiciona o evento de clique para os botões de remover item
        $('.remove-item').click(function() {
            var index = $(this).data('index');
            removeFromCart(index);
        });
    }

    // Função para adicionar um item ao carrinho
    function addToCart(product) {
        var existingItem = cartItems.find(function(item) {
            return item.name === product.name;
        });

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            product.quantity = 1;
            cartItems.push(product);
        }

        localStorage.setItem('cart', JSON.stringify(cartItems));
        updateCart();
    }

    // Função para remover um item do carrinho
    function removeFromCart(index) {
        cartItems.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cartItems));
        updateCart();
    }
    
    // Atualiza o contador do carrinho
    function updateCartCounter() {
        var itemCount = cartItems.reduce(function(total, item) {
            return total + item.quantity;
        }, 0);
        $('#cart-counter').text(itemCount);
    }

    // Função para calcular e atualizar o preço total
    function updateTotalPrice() {
        var totalPrice = cartItems.reduce(function(total, item) {
            return total + (parseFloat(item.price) * item.quantity);
        }, 0);
        $('#total-price').text('Total: R$ ' + totalPrice.toFixed(2));
    }

    // Função para finalizar a compra
    function finalizePurchase() {
        // Salva as informações do carrinho no sessionStorage
        sessionStorage.setItem('checkoutCart', JSON.stringify(cartItems));
        // Redireciona para a página de finalização
        window.location.href = '/finalizar';
    }
    
    // Evento de clique para o botão "Finalizar Compras"
    $('#checkout-button').click(function() {
        finalizePurchase();
    });

    // Evento de clique para adicionar ao carrinho
    $('.add-to-cart').click(function() {
        var product = {
            name: $(this).closest('.card-body').find('.card-title').text(),
            price: $(this).closest('.card-body').find('.price').text().replace('Preço: R$ ', ''),
            imageUrl: $(this).closest('.card').find('.card-img-top').attr('src')
        };
        addToCart(product);
    });
    // Abre o modal do carrinho quando o botão de carrinho é clicado
    $('#cart-button').click(function() {
        $('#cartModal').modal('show');
    });
});
