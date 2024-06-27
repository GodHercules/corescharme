$(document).ready(function() {
    // Evento de clique para o botão "Comprar Agora" na página de produtos
    $('.comprar-agora').click(function() {
        var product = {
            id: $(this).data('id'),
            name: $(this).data('name'),
            price: $(this).data('price'),
            imageUrl: $(this).data('imageurl'),
            quantity: 1 // Define a quantidade como 1 para "Comprar Agora"
        };

        // Salva o produto no sessionStorage e redireciona para a página de finalização
        sessionStorage.setItem('checkoutProduct', JSON.stringify(product));
        window.location.href = '/finalizar';
    });
});
