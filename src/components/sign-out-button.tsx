"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
export function SignOutButton(){ const router=useRouter(); return <button className="btn btn-secondary" style={{padding:"7px 10px"}} onClick={async()=>{await authClient.signOut();router.push("/login");router.refresh();}}>Sign out</button>; }
