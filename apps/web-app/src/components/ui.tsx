import type {ButtonHTMLAttributes,InputHTMLAttributes,ReactNode,SelectHTMLAttributes} from "react";
import {cva,type VariantProps} from "class-variance-authority";import{twMerge}from"tailwind-merge";import{clsx,type ClassValue}from"clsx";
export function cn(...inputs:ClassValue[]){return twMerge(clsx(inputs));}
const buttonVariants=cva("button",{variants:{variant:{primary:"primary",secondary:"secondary"}},defaultVariants:{variant:"primary"}});
export function Button({variant,className,...props}:ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof buttonVariants>){return <button className={cn(buttonVariants({variant}),className)} {...props}/>}
export function Field({label,hint,error,children,className}:{label:string;hint?:string;error?:string;children:ReactNode;className?:string}){return <div className={cn("field",className)}><label>{label}</label>{children}{hint&&<small>{hint}</small>}{error&&<span className="error-text">{error}</span>}</div>}
export function Input(props:InputHTMLAttributes<HTMLInputElement>){return <input className="input" {...props}/>}
export function Select(props:SelectHTMLAttributes<HTMLSelectElement>){return <select className="select" {...props}/>}
