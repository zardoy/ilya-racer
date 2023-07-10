const canvas = document.querySelector('canvas')!
const ctx = canvas.getContext('2d')!

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

setInterval(() => {
    objects.push({
        x: canvas.width,
        y: Math.random() > 0.5 ? 0 : -1,
    })
}, NEW_OBJECT_INTERVAL)

let center: number
let topEdge: number
let bottomEdge: number
let ballY: number
let ballState = 2
let score = 0

let prevUpdateCoordsTime = 0
let paused = false

const ballInput = () => {
    if (paused) {
        prevUpdateCoordsTime = performance.now()
        paused = false
        requestAnimationFrame(renderFrame)
        return
    }
    if (Math.abs(ballState) === 1) return
    ballState = ballState === 2 ? -1 : 1
}

addEventListener('keydown', ({ code }) => {
    if (code === 'Space') {
        ballInput()
    }
})

addEventListener('pointerdown', ({ target }) => {
    if ((target as HTMLElement).tagName.toLowerCase() !== 'canvas') return
    ballInput()
})

const connectedGamepads = [] as Gamepad[]

let pullGamepadsInterval: number
const gamepadConnected = () => {
    pullGamepadsInterval = setInterval(() => {
        for (const [i, gamepad] of connectedGamepads.entries()) {
            if (gamepad.buttons) {
                ballInput()
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

const renderPlayer = (color: string | CanvasGradient | CanvasPattern) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(PLAYER_X, ballY, BALL_PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.strokeRect(PLAYER_X - BALL_PLAYER_RADIUS, ballY - BALL_PLAYER_RADIUS, BALL_PLAYER_RADIUS * 2, BALL_PLAYER_RADIUS * 2)
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
    paused = true
    let fontSize = 60
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = isGameOver ? 'red' : 'lightgreen'
    let printText = isGameOver ? 'Game Over' : 'Paused'
    ctx.fillText(printText, (canvas.width - ctx.measureText(printText).width) / 2, center - fontSize / 2)

    fontSize = 30
    ctx.font = `${fontSize}px sans-serif`
    printText = 'Click or press space to continue'
    ctx.fillText(printText, (canvas.width - ctx.measureText(printText).width) / 2, center + fontSize / 2)

    if (isGameOver) {
        objects.splice(0, objects.length)
        score = 0
    }
}

window.addEventListener('blur', () => {
    if (paused) return
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
        if (
            isIntersects(y, y + OBJECT_SIZE, ballY - BALL_PLAYER_RADIUS, ballY + BALL_PLAYER_RADIUS) &&
            isIntersects(x, x + OBJECT_SIZE, PLAYER_X - BALL_PLAYER_RADIUS, PLAYER_X + BALL_PLAYER_RADIUS)
        ) {
            pauseOrEndGame(true)
            return
        }

        if (x <= -OBJECT_SIZE) {
            objects.splice(i, 1)
            i--
            score++
        }
    }

    const ballAtBottom = bottomEdge - BALL_PLAYER_RADIUS
    const ballAtTop = topEdge + BALL_PLAYER_RADIUS
    if (Math.abs(ballState) === 1) {
        ballY += ballState * updateUnits
        if (ballY >= ballAtBottom) ballState = 2
        if (ballY <= ballAtTop) ballState = -2
    } else {
        ballY = ballState === 2 ? ballAtBottom : ballAtTop
    }
}

const renderFrame = (timestamp: DOMHighResTimeStamp) => {
    if (paused) return
    updateCoords(timestamp)
    if (paused) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    renderEdges()
    if (Math.abs(ballState) !== 1) {
        ballY = ballState === 2 ? bottomEdge - BALL_PLAYER_RADIUS : topEdge + BALL_PLAYER_RADIUS
    }
    renderPlayer('deepskyblue')
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
