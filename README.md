# 🚗 DestruidorPedal

### A marcha à ré nunca foi tão desafiadora!

**Um jogo de corrida 3D em que o objetivo é atravessar pistas cheias de obstáculos dirigindo somente de ré.**

**Direção de ré • Desafios e obstáculos • Cenários 3D • 4 fases**

---

## 🏁 Sobre o jogo

O **DestruidorPedal** é um jogo de direção e habilidade no qual o jogador controla um carro e precisa superar obstáculos para alcançar a linha de chegada.

Mas existe um detalhe que muda completamente a experiência: **o carro só pode ser conduzido de ré!**

O jogador precisa controlar a direção, observar o caminho, calcular os movimentos e encontrar espaço para passar pelas barreiras, cones e outros obstáculos espalhados pela pista.

A proposta é transformar uma tarefa simples — chegar ao final de uma corrida — em um desafio diferente, que exige atenção, precisão e coordenação.

> **Prepare-se, engate a ré e tente chegar até a linha de chegada sem bater!**

## 🎮 Como jogar

1. Escolha uma das fases disponíveis.
2. Observe a pista e identifique os obstáculos.
3. Segure o comando de ré para movimentar o carro.
4. Use a direção para desviar das barreiras, cones e blocos.
5. Alcance os checkpoints e chegue à linha de chegada.

## 🏆 Fases

| **Fase** | **Descrição** |
| --- | --- |
| 🟢 Fase 1 — Aprendizado | Introduz os controles e os primeiros obstáculos. |
| 🟡 Fase 2 — Precisão | Exige mais cuidado nas manobras e na escolha do caminho. |
| 🔴 Fase 3 — Sobrevivência | Aumenta o desafio com sequências de obstáculos. |
| 🌀 Fase 4 — Infinita: Curvas Insanas | Apresenta curvas intensas e obstáculos distribuídos pela pista. |

## ⌨️ Controles

| **Tecla** | **Ação** |
| --- | --- |
| **S** ou **↓** | Acelerar de ré |
| **W** ou **↑** | Frear / movimentar para frente |
| **A** / **D** ou **←** / **→** | Direcionar o carro |
| **Espaço** | Freio de mão |
| **C** | Alternar a câmera |
| **R** | Reiniciar a fase |
| **Esc** | Pausar o jogo |

## 🌲 Cenário e recursos

- Pistas com curvas e mudanças de direção.
- Barreiras, cones e blocos para desviar.
- Checkpoints ao longo das fases.
- Cenário 3D com árvores, pedras, iluminação e elementos decorativos.
- Câmera jogável que acompanha o veículo.
- Modelo 3D de carro e modelos de vegetação carregados pela pasta de recursos.

## ⚙️ Tecnologias

**HTML5 • CSS3 • JavaScript • Three.js • WebGL**

O jogo utiliza Three.js para renderizar o ambiente tridimensional, o veículo, os obstáculos e os elementos do cenário. Os arquivos dos modelos 3D ficam na pasta `assets`.

## 💻 Como executar o projeto

1. Baixe ou clone este repositório.
2. Extraia os arquivos, caso tenha baixado o projeto em ZIP.
3. Mantenha a pasta `assets` junto de `index.html`, `style.css` e `game.js`.
4. Abra a pasta do projeto no Visual Studio Code.
5. Execute o arquivo `index.html` com uma extensão de servidor local, como o **Live Server**.

**Importante:** não mova nem renomeie os modelos dentro da pasta `assets` sem atualizar os caminhos correspondentes no código. O jogo precisa desses arquivos para carregar o carro e a vegetação.

## 🚀 Otimizações

O projeto também conta com ajustes de desempenho gráfico, como:

- Uso de `InstancedMesh` para agrupar elementos repetidos do cenário.
- Limite na resolução de renderização.
- Redução da resolução do mapa de sombras.
- Redução do custo de sombras em elementos decorativos.
- Ajustes na filtragem de texturas.

As otimizações buscam melhorar o desempenho sem alterar a proposta principal, os controles ou os desafios do jogo. O resultado de FPS pode variar conforme o computador utilizado.

---

**Projeto: DestruidorPedal**

### Uma corrida diferente, um desafio de cada vez. Você consegue chegar ao final dirigindo de ré?
##  link do jogo
**👉https://ck-luxix.github.io/DestruidorPedal/** 
