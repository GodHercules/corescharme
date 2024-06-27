// Função para calcular o frete com base no CEP
function calculateShipping(cep) {
    var url = 'https://calcularfrete.pythonanywhere.com/calcular-frete?peso=10&cep_origem=41620620&cep_destino='+cep;

    $.ajax({
        url: url,
        type: 'GET',
        success: function(response) {
            // Exiba as informações do frete na página
            displayShippingInfo(response);
        },
        error: function(xhr, status, error) {
            console.error('Erro ao calcular o frete:', error);
        }
    });
}

// Função para exibir as informações do frete na página
function displayShippingInfo(response) {
    $('#shipping-info').html(
        '<p>Valor do frete: R$ ' + response.valor_frete + '</p>'
    );
}

