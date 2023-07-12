const canvas = document.querySelector('canvas')!
const ctx = canvas.getContext('2d')!

type Player = {
    y: number
    state: number
    color: string
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
})

window.dispatchEvent(new Event('resize'))

const OBJECT_SIZE = 50
const PLAYER_X = 100
const BALL_PLAYER_RADIUS = 30
const SPACE = 250
const NEW_OBJECT_INTERVAL = 3_000

const objects: Array<{ x: number; y: number }> = []

let gameState = 'running' as 'running' | 'paused' | 'gameover'
let onInteraction = () => {}
setInterval(() => {
    if (gameState !== 'running') return
    objects.push({
        x: canvas.width,
        y: Math.random() > 0.5 ? 0 : -1,
    })
}, NEW_OBJECT_INTERVAL)

let playersCount = 1

let center: number
let topEdge: number
let bottomEdge: number

const players: Array<Player> = []
let score = 0

let prevUpdateCoordsTime = 0

document.querySelector('#players_count input')!.addEventListener('change', ({ target }) => {
    playersCount = (target as HTMLInputElement).checked ? 2 : 1
})

const ballInput = (playerIndex: number) => {
    onInteraction()
    if (gameState !== 'running') {
        prevUpdateCoordsTime = performance.now()
        gameState = 'running'
        requestAnimationFrame(renderFrame)
        return
    }
    const player = players[playerIndex] ?? players[0]
    if (!player) return
    if (Math.abs(player.state) === 1) return
    player.state = player.state === 2 ? -1 : 1
}

addEventListener('keydown', e => {
    if (e.code === 'Space') {
        ballInput(0)
    } else if (e.code === 'Enter') {
        ballInput(1)
    }
})

addEventListener('pointerdown', ({ target, clientX }) => {
    if ((target as HTMLElement).tagName.toLowerCase() !== 'canvas') return
    if (clientX < canvas.width / 2) {
        ballInput(0)
    } else {
        ballInput(1)
    }
})

const connectedGamepads = [] as Gamepad[]

let pullGamepadsInterval: number
const gamepadConnected = () => {
    pullGamepadsInterval = setInterval(() => {
        for (const [i, gamepad] of connectedGamepads.entries()) {
            if (gamepad.buttons) {
                ballInput(i)
            }
        }
    }, 100)
}
addEventListener('gamepadconnected', ({ gamepad }) => {
    connectedGamepads.push(gamepad)

    gamepadConnected()
})
removeEventListener('gamepaddisconnected', ({ gamepad }) => {
    connectedGamepads.splice(connectedGamepads.indexOf(gamepad), 1)

    if (connectedGamepads.length === 0) {
        clearInterval(pullGamepadsInterval)
    }
})

const renderPlayer = (player: Player) => {
    const { color, y } = player

    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(PLAYER_X, y, BALL_PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.strokeRect(PLAYER_X - BALL_PLAYER_RADIUS, y - BALL_PLAYER_RADIUS, BALL_PLAYER_RADIUS * 2, BALL_PLAYER_RADIUS * 2)
}

const renderEdges = () => {
    ctx.fillStyle = 'limegreen'
    for (const y of [topEdge, bottomEdge]) {
        ctx.fillRect(0, y, canvas.width, 2)
    }
}

const renderObjects = () => {
    ctx.fillStyle = 'red'
    for (const object of objects) {
        ctx.fillRect(object.x, object.y < 0 ? bottomEdge - OBJECT_SIZE : topEdge, OBJECT_SIZE, OBJECT_SIZE)
    }
}

const isIntersects = (x1Start: number, x1End: number, x2Start: number, x2End: number) => {
    return x1Start <= x2End && x1End >= x2Start
}

const SPEED_FACTOR = 0.3
const SPEED_OBJECTS_FACTOR = 1

const pauseOrEndGame = (isGameOver: boolean) => {
    gameState = isGameOver ? 'gameover' : 'paused'

    if (isGameOver) {
        onInteraction = () => {
            objects.splice(0, objects.length)
            score = 0
            onInteraction = () => {}
        }
    }
}

const renderPaused = () => {
    const isGameOver = gameState === 'gameover'

    let fontSize = 60
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = isGameOver ? 'red' : 'lightgreen'
    let printText = isGameOver ? 'Game Over' : 'Paused'
    ctx.fillText(printText, (canvas.width - ctx.measureText(printText).width) / 2, center - fontSize / 2)

    fontSize = 30
    ctx.font = `${fontSize}px sans-serif`
    printText = 'Click or press space to continue'
    ctx.fillText(printText, (canvas.width - ctx.measureText(printText).width) / 2, center + fontSize / 2)
}

window.addEventListener('blur', () => {
    if (gameState !== 'running') return
    pauseOrEndGame(false)
})

const updateCoords = (timestamp: number) => {
    center = canvas.height / 2
    bottomEdge = center + SPACE / 2
    topEdge = center - SPACE / 2

    const timePassed = timestamp - prevUpdateCoordsTime
    prevUpdateCoordsTime = timestamp
    const updateUnits = timePassed * SPEED_FACTOR

    for (let i = 0; i < objects.length; i++) {
        objects[i]!.x -= updateUnits * SPEED_OBJECTS_FACTOR
        const { x, y: objY } = objects[i]!
        const y = objY >= 0 ? topEdge : bottomEdge - OBJECT_SIZE
        for (const { y: playerY } of players) {
            if (
                isIntersects(y, y + OBJECT_SIZE, playerY - BALL_PLAYER_RADIUS, playerY + BALL_PLAYER_RADIUS) &&
                isIntersects(x, x + OBJECT_SIZE, PLAYER_X - BALL_PLAYER_RADIUS, PLAYER_X + BALL_PLAYER_RADIUS)
            ) {
                pauseOrEndGame(true)
                return
            }
        }

        if (x <= -OBJECT_SIZE) {
            objects.splice(i, 1)
            i--
            score++
        }
    }

    const ballAtBottom = bottomEdge - BALL_PLAYER_RADIUS
    const ballAtTop = topEdge + BALL_PLAYER_RADIUS
    for (const player of players) {
        if (Math.abs(player.state) === 1) {
            player.y += player.state * updateUnits
            if (player.y >= ballAtBottom) player.state = 2
            if (player.y <= ballAtTop) player.state = -2
        } else {
            player.y = player.state === 2 ? bottomEdge - BALL_PLAYER_RADIUS : topEdge + BALL_PLAYER_RADIUS
        }
    }
}

const renderPlayers = () => {
    if (players.length < playersCount) {
        for (let i = players.length; i < playersCount; i++) {
            players.push({
                state: i % 2 ? 2 : -2,
                y: i % 2 ? bottomEdge - BALL_PLAYER_RADIUS : topEdge + BALL_PLAYER_RADIUS,
                color: i ? 'dodgerblue' : 'deepskyblue',
            })
        }
    } else if (players.length > playersCount) {
        players.splice(playersCount, players.length - playersCount)
    }

    for (const player of players) {
        renderPlayer(player)
    }
}

const renderFrame = (timestamp: DOMHighResTimeStamp) => {
    if (gameState === 'running') {
        updateCoords(timestamp)
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (gameState !== 'running') {
        renderPaused()
    }

    renderEdges()

    renderPlayers()
    renderObjects()
    ctx.font = '20px sans-serif'
    ctx.fillStyle = 'white'
    ctx.fillText(`Score: ${score}`, 0, 50)
    requestAnimationFrame(renderFrame)
}

requestAnimationFrame(time => {
    renderFrame(time)
    pauseOrEndGame(false)
})
