"use client"
import React from 'react'

type Props = {
    children: React.ReactNode,
	addStyle?: string,
	position?: string,
	background?: string,
	noAnimation?: boolean,
	noGradient?: boolean,
	rounded?: string,
	shadow?: string
}

const TileWithGradientBorder: React.FC<Props> = ({ children, addStyle, position, background, noAnimation, noGradient, rounded, shadow }) => {
	return (
		<div className={`${noGradient ? "" : "bg-gradient-to-r"} from-highlight via-cyan-800 to-highlight/50 p-[1px] ${rounded ? rounded : "rounded-xl"} z-0 ${ noAnimation ? "" : "gradient-hover-animate"} font-semibold w-full ${shadow}`}>
			<div className={`z-1 ${background ? background : "bg-primary hover:bg-neutral-900"} px-4 py-3 ${rounded ? rounded : "rounded-xl"} h-full flex ${position ? position : "justify-center items-center" } ${addStyle}`}>
				{children}
			</div>
		</div>
	)
}

export default TileWithGradientBorder