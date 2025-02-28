import styles from "../../styles/Decorator.module.css"

const MovingDecorator = ({ initialPosition, initialRotation, width, height, index, color }) => {
  const positionAnimName = `float-${index}`

  const animationStyle = {
    position: "absolute",
    top: initialPosition.y,
    left: initialPosition.x,
    width: `${width*2}px`,
    height: `${height*2}px`,
    transform: `rotateX(${initialRotation.x}deg) rotateY(${initialRotation.y}deg) rotateZ(${initialRotation.z}deg)`,
    animation: `${positionAnimName} ${20 + (index % 10)}s ease-in-out infinite alternate`,
    background: `radial-gradient(${color} 0%, rgba(0, 0, 0, 0) 50%)`,
  }

  const keyframesStyle = `
        @keyframes ${positionAnimName} {
            0% {
                transform: translate(0, 0) rotateX(${initialRotation.x}deg) rotateY(${initialRotation.y}deg) rotateZ(${initialRotation.z}deg);
            }
            25% {
                transform: translate(${2 + (index % 5)}vw, ${-2 - (index % 3)}vh) rotateX(${initialRotation.x + 45}deg) rotateY(${initialRotation.y - 30}deg) rotateZ(${initialRotation.z + 15}deg);
            }
            50% {
                transform: translate(${-1.5 - (index % 4)}vw, ${2.5 + (index % 3)}vh) rotateX(${initialRotation.x - 30}deg) rotateY(${initialRotation.y + 60}deg) rotateZ(${initialRotation.z - 25}deg);
            }
            75% {
                transform: translate(${-2.5 - (index % 5)}vw, ${-1.5 - (index % 4)}vh) rotateX(${initialRotation.x + 60}deg) rotateY(${initialRotation.y - 45}deg) rotateZ(${initialRotation.z + 30}deg);
            }
            100% {
                transform: translate(${1.5 + (index % 3)}vw, ${2 + (index % 4)}vh) rotateX(${initialRotation.x - 45}deg) rotateY(${initialRotation.y + 30}deg) rotateZ(${initialRotation.z - 15}deg);
            }
        }
    `

  return (
    <>
      <style>{keyframesStyle}</style>
      <div className={`${styles.decoratorBox}`} style={animationStyle}></div>
    </>
  )
}

const DecoratorWrapper = () => {
  const colors = [
    "var(--primary)",
    "var(--secondary)",
    "var(--tertiary)",
    "var(--quaternary)",
    "var(--primaryLight)",
    "var(--secondaryLight)",
    "var(--tertiaryLight)",
    "var(--quaternaryLight)",
    "var(--lightGreen)",
    "var(--lightRed)",
    "var(--offWhite)",
  ]

  const decorators = [
    { position: { x: "5vw", y: "15vh" }, rotation: { x: 30, y: 45, z: -15 }, size: { width: 120, height: 120 } },
    { position: { x: "75vw", y: "25vh" }, rotation: { x: -20, y: -60, z: 30 }, size: { width: 100, height: 100 } },
    { position: { x: "60vw", y: "70vh" }, rotation: { x: 45, y: 30, z: -45 }, size: { width: 90, height: 90 } },
    { position: { x: "15vw", y: "80vh" }, rotation: { x: -30, y: 75, z: 15 }, size: { width: 80, height: 80 } },
    { position: { x: "40vw", y: "20vh" }, rotation: { x: 60, y: -45, z: 30 }, size: { width: 110, height: 110 } },
    { position: { x: "85vw", y: "60vh" }, rotation: { x: -45, y: 30, z: -60 }, size: { width: 95, height: 95 } },
    { position: { x: "25vw", y: "45vh" }, rotation: { x: 15, y: -75, z: 45 }, size: { width: 85, height: 85 } },
    { position: { x: "50vw", y: "85vh" }, rotation: { x: -60, y: 45, z: -30 }, size: { width: 105, height: 105 } },
    { position: { x: "90vw", y: "10vh" }, rotation: { x: 75, y: -30, z: 60 }, size: { width: 70, height: 70 } },
    { position: { x: "10vw", y: "50vh" }, rotation: { x: -15, y: 60, z: -45 }, size: { width: 115, height: 115 } },
    { position: { x: "65vw", y: "5vh" }, rotation: { x: 30, y: -75, z: 15 }, size: { width: 75, height: 75 } },
    { position: { x: "35vw", y: "65vh" }, rotation: { x: -75, y: 30, z: -60 }, size: { width: 100, height: 100 } },
  ]

  return (
    <div className={styles.decoratorWrapper}>
      {decorators.map((decorator, index) => (
        <MovingDecorator
          key={index}
          index={index}
          initialPosition={decorator.position}
          initialRotation={decorator.rotation}
          width={decorator.size.width}
          height={decorator.size.height}
          color={colors[index % colors.length]}
        />
      ))}
    </div>
  )
}

export default DecoratorWrapper

