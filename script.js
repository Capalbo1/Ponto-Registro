document.addEventListener('DOMContentLoaded', function() {
    const registrarBtn = document.getElementById('registrarBtn');
    
    registrarBtn.addEventListener('click', function() {
        const nome = document.getElementById('nome').value;
        const instituicao = document.getElementById('instituicao').value;
        
        if (!nome || !instituicao) {
            alert('Por favor, preencha todos os campos!');
            return;
        }
        
        // Mostrar loading
        document.getElementById('loading').classList.remove('hidden');
        registrarBtn.disabled = true;
        
        // Obter data/hora atual
        const agora = new Date();
        const dataHora = formatarDataHora(agora);
        
        // Obter localização
        obterLocalizacaoCompleta()
            .then(resultado => {
                // Preencher dados do registro
                document.getElementById('registroNome').textContent = nome;
                document.getElementById('registroInstituicao').textContent = instituicao;
                document.getElementById('registroData').textContent = dataHora;
                document.getElementById('registroLocalizacao').textContent = resultado.localizacao;
                document.getElementById('registroEndereco').textContent = resultado.endereco || "Endereço não disponível";
                document.getElementById('registroCoordenadas').textContent = resultado.coordenadas || "Coordenadas não disponíveis";
                
                // Esconder loading e mostrar registro
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('registro').classList.remove('hidden');
                registrarBtn.disabled = false;
            })
            .catch(error => {
                console.error('Erro:', error);
                document.getElementById('registroLocalizacao').textContent = "Localização não disponível";
                document.getElementById('registroEndereco').textContent = "Não foi possível obter o endereço";
                
                // Esconder loading e mostrar registro mesmo com erro
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('registro').classList.remove('hidden');
                registrarBtn.disabled = false;
            });
    });
    
    // Função para formatar data e hora
    function formatarDataHora(data) {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const horas = String(data.getHours()).padStart(2, '0');
        const minutos = String(data.getMinutes()).padStart(2, '0');
        
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }
    
    // Função principal para obter localização completa
    async function obterLocalizacaoCompleta() {
        try {
            // 1. Tentar obter geolocalização
            const posicao = await obterGeolocalizacao();
            const lat = posicao.coords.latitude;
            const lon = posicao.coords.longitude;
            const coordenadas = `Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`;
            
            // 2. Obter endereço completo
            const endereco = await obterEnderecoPorCoordenadas(lat, lon);
            
            return {
                localizacao: "Obtido via GPS",
                endereco: formatarEndereco(endereco),
                coordenadas: coordenadas
            };
            
        } catch (error) {
            console.error('Falha na geolocalização:', error);
            
            // Se falhar, tentar por IP
            try {
                const localizacaoIP = await obterLocalizacaoPorIP();
                return {
                    localizacao: "Obtido via IP",
                    endereco: localizacaoIP.endereco,
                    coordenadas: localizacaoIP.coordenadas || "Precisão limitada"
                };
            } catch (ipError) {
                console.error('Falha na localização por IP:', ipError);
                throw new Error('Não foi possível obter a localização');
            }
        }
    }
    
    // Função para obter geolocalização
    function obterGeolocalizacao() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalização não suportada'));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    }
    
    // Função para obter endereço por coordenadas (usando Nominatim - OpenStreetMap)
    async function obterEnderecoPorCoordenadas(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            
            if (!response.ok) {
                throw new Error('Erro na API de geocodificação');
            }
            
            const data = await response.json();
            return data.address || data;
            
        } catch (error) {
            console.error('Erro ao obter endereço:', error);
            throw error;
        }
    }
    
    // Função para formatar endereço
    function formatarEndereco(endereco) {
        if (!endereco) return "Endereço não disponível";
        
        const parts = [];
        if (endereco.road) parts.push(endereco.road);
        if (endereco.house_number) parts.push(endereco.house_number);
        if (endereco.neighbourhood) parts.push(endereco.neighbourhood);
        if (endereco.suburb) parts.push(endereco.suburb);
        if (endereco.city || endereco.town || endereco.village) parts.push(endereco.city || endereco.town || endereco.village);
        if (endereco.state) parts.push(endereco.state);
        if (endereco.postcode) parts.push(endereco.postcode);
        if (endereco.country) parts.push(endereco.country);
        
        return parts.join(', ');
    }
    
    // Função para obter localização por IP (simulada)
    async function obterLocalizacaoPorIP() {
        return new Promise((resolve) => {
            // Simulação - em produção usar uma API real como ipapi.co
            setTimeout(() => {
                const cidades = [
                    { city: "São Paulo", region: "SP", country: "Brasil" },
                    { city: "Rio de Janeiro", region: "RJ", country: "Brasil" },
                    { city: "Belo Horizonte", region: "MG", country: "Brasil" },
                    { city: "Porto Alegre", region: "RS", country: "Brasil" },
                    { city: "Salvador", region: "BA", country: "Brasil" }
                ];
                
                const randomCity = cidades[Math.floor(Math.random() * cidades.length)];
                const endereco = `${randomCity.city}, ${randomCity.region}, ${randomCity.country}`;
                
                resolve({
                    endereco: endereco,
                    coordenadas: "Precisão limitada por IP"
                });
            }, 1000);
        });
    }
});