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

const objects: Array<{x: number, y: number}> = []

setInterval(() => {
    objects.push({
        x: canvas.width,
        y: Math.random() > 0.5 ? 0 : -1
    })
}, NEW_OBJECT_INTERVAL)

let center: number
let topEdge: number
let bottomEdge: number
let ballY: number
let ballState = 2
let score = 0

const userToggleBallState = () => {
    if (Math.abs(ballState) === 1) return
    ballState = ballState === 2 ? -1 : 1
}

addEventListener('keydown', ({ code }) => {
    if (code === 'Space') {
        userToggleBallState()
    }
})

addEventListener('touchstart', () => {
    userToggleBallState()
})

const renderPlayer = (color) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(PLAYER_X, ballY, BALL_PLAYER_RADIUS, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.strokeRect(
        PLAYER_X - BALL_PLAYER_RADIUS,
        ballY - BALL_PLAYER_RADIUS,
        BALL_PLAYER_RADIUS * 2,
        BALL_PLAYER_RADIUS * 2
    )
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
        ctx.fillRect(
            object.x,
            object.y < 0 ? bottomEdge - OBJECT_SIZE : topEdge,
            OBJECT_SIZE,
            OBJECT_SIZE
        )
    }
}

const isIntersects = (x1Start, x1End, x2Start, x2End) => {
    return x1Start <= x2End && x1End >= x2Start
}

const SPEED_FACTOR = 0.3
const SPEED_OBJECTS_FACTOR = 1

let prevUpdateCoordsTime = 0

const updateCoords = (timestamp) => {
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
            alert('game over')
            objects.splice(0, objects.length)
            score = 0
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

const renderFrame = (timestamp) => {
    updateCoords(timestamp)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    renderEdges()
    if (Math.abs(ballState) !== 1) {
        ballY = ballState === 2 ? bottomEdge - BALL_PLAYER_RADIUS : topEdge + BALL_PLAYER_RADIUS
    }
    renderPlayer('deepskyblue')
    renderObjects()
    requestAnimationFrame(renderFrame)
    ctx.fillStyle = 'white'
    ctx.fillText(`Score: ${score}`, 0, 50)
}

requestAnimationFrame(renderFrame)
