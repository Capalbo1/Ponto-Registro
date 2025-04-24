document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const registrarBtn = document.getElementById('registrarBtn');
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFW5bz939j8izEqDc2KsWl4L_3NNHSGiIMhhB944v-w6qsQROL0mnpNrS8T9T5X0eH/exec';

    // Função para formatar data/hora (agora definida corretamente)
    function formatarDataHora(data) {
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();
        const horas = String(data.getHours()).padStart(2, '0');
        const minutos = String(data.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    }

    // Evento de clique do botão
    registrarBtn.addEventListener('click', async function() {
        const nome = document.getElementById('nome').value.trim();
        const instituicao = document.getElementById('instituicao').value;
        
        if (!nome || !instituicao) {
            alert('Por favor, preencha todos os campos!');
            return;
        }
        
        // Mostrar loading
        document.getElementById('loading').classList.remove('hidden');
        registrarBtn.disabled = true;
        
        try {
            // Obter data/hora atual (usando a função agora definida)
            const agora = new Date();
            const dataHora = formatarDataHora(agora);
            
            // Obter localização com fallback
            const resultado = await obterLocalizacaoCompleta();
            
            // Preencher dados na tela
            preencherDadosRegistro(nome, instituicao, dataHora, resultado);
            
            // Obter IP
            const ip = await obterIP();
            
            // Enviar para o Google Sheets
            await enviarParaGoogleSheets({
                nome,
                instituicao,
                dataHora,
                localizacao: resultado.localizacao,
                endereco: resultado.endereco || "N/A",
                coordenadas: resultado.coordenadas || "N/A",
                ip: ip || "N/A"
            });
            
        } catch (error) {
            console.error('Erro no processo principal:', error);
            alert('Ocorreu um erro ao registrar. Tente novamente.');
        } finally {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('registro').classList.remove('hidden');
            registrarBtn.disabled = false;
        }
    });

    // Função para preencher os dados na tela
    function preencherDadosRegistro(nome, instituicao, dataHora, resultado) {
        document.getElementById('registroNome').textContent = nome;
        document.getElementById('registroInstituicao').textContent = instituicao;
        document.getElementById('registroData').textContent = dataHora;
        document.getElementById('registroLocalizacao').textContent = 
            resultado?.localizacao || "Localização não disponível";
        document.getElementById('registroEndereco').textContent = 
            resultado?.endereco || "Endereço não disponível";
        document.getElementById('registroCoordenadas').textContent = 
            resultado?.coordenadas || "Coordenadas não disponíveis";
    }

    // Função para obter localização completa
    async function obterLocalizacaoCompleta() {
        try {
            const posicao = await obterGeolocalizacao();
            const lat = posicao.coords.latitude;
            const lon = posicao.coords.longitude;
            const coordenadas = `Lat: ${lat.toFixed(6)}, Long: ${lon.toFixed(6)}`;
            
            const endereco = await obterEnderecoPorCoordenadas(lat, lon);
            
            return {
                localizacao: "Obtido via GPS",
                endereco: formatarEndereco(endereco),
                coordenadas: coordenadas
            };
            
        } catch (error) {
            console.error('Falha na geolocalização:', error);
            const localizacaoIP = await obterLocalizacaoPorIP();
            return {
                localizacao: "Obtido via IP",
                endereco: localizacaoIP.endereco,
                coordenadas: localizacaoIP.coordenadas || "Precisão limitada"
            };
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

    // Função para obter endereço por coordenadas
    async function obterEnderecoPorCoordenadas(lat, lon) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
            
            if (!response.ok) {
                throw new Error('Erro na API de geocodificação');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao obter endereço:', error);
            throw error;
        }
    }

    // Função para formatar endereço
    function formatarEndereco(endereco) {
        if (!endereco || !endereco.address) return "Endereço não disponível";
        
        const addr = endereco.address;
        const parts = [];
        if (addr.road) parts.push(addr.road);
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.neighbourhood) parts.push(addr.neighbourhood);
        if (addr.suburb) parts.push(addr.suburb);
        if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);
        if (addr.state) parts.push(addr.state);
        if (addr.postcode) parts.push(addr.postcode);
        if (addr.country) parts.push(addr.country);
        
        return parts.join(', ');
    }

    // Função para obter localização por IP
    async function obterLocalizacaoPorIP() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return {
                endereco: `${data.city}, ${data.region}, ${data.country_name}`,
                coordenadas: "Precisão limitada por IP"
            };
        } catch (error) {
            console.error('Erro ao obter localização por IP:', error);
            return {
                endereco: "Localização aproximada",
                coordenadas: "Não disponível"
            };
        }
    }

    // Função para obter IP
    async function obterIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return "IP não disponível";
        }
    }

    // Função para enviar dados ao Google Sheets
    async function enviarParaGoogleSheets(dados) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dados)
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Falha ao enviar dados:', error);
            throw error;
        }
    }
});