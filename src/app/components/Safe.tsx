'use client';
import React from 'react';

export class Safe extends React.Component<{fallback?: React.ReactNode},{hasError:boolean}>{
  constructor(p:any){ 
    super(p); 
    this.state={hasError:false}; 
  }
  
  static getDerivedStateFromError(){ 
    return {hasError:true}; 
  }
  
  componentDidCatch(err:any){ 
    console.error('[SafeCardError]', err); 
  }
  
  render(){ 
    return this.state.hasError ? (this.props.fallback ?? null) : this.props.children as any; 
  }
}
