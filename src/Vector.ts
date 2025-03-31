import { Display } from "./Display.js";

export class Vector{
    x : number;
    y : number;
    private display : Display = Display.Instance;  // I think this might be wrong because it is only refering to the old instance of display and not updated to the latest one

    constructor(_x: number, _y : number){
        this.x = _x;
        this.y = _y;
    }

    get length(){
        return Vector.Length(this);
    }

    get lengthSquared(){
        return Vector.LengthSquared(this);
    }

    get unit(){
        return Vector.Normalize(this);
    }

    Rotate(angle : number){
        return Vector.Rotate(this, angle);
    }

    Scale(scalar: number){
        return Vector.Scale(this, scalar);
    }

    ToGraph(){
        return Vector.ToGraph(this);
    }


    static Add(v1 : Vector, v2 : Vector) : Vector{
        return new Vector(v1.x + v2.x, v1.y + v2.y);
    }

    static Sub(v1 : Vector, v2 : Vector) : Vector{
        return new Vector(v1.x - v2.x, v1.y - v2.y);
    }

    static Length(v : Vector) : number{
        return Math.sqrt(v.x*v.x + v.y*v.y);
    }

    static LengthSquared(v : Vector) : number{
        return v.x*v.x + v.y*v.y;
    }

    static Normalize(v : Vector) : Vector{
        let magnitude : number = Vector.Length(v);
        return new Vector(v.x/magnitude, v.y/magnitude);
    }

    static Rotate(v : Vector, angle : number) : Vector{
        let x : number = v.x * Math.cos(angle) - v.y * Math.sin(angle);
        let y : number = v.x * Math.sin(angle) + v.y * Math.cos(angle);
        return new Vector(x, y);
    }

    static Scale(v : Vector, scalar : number) : Vector{
        return new Vector(v.x * scalar, v.y * scalar);
    }

    static VectorScale(v1 : Vector, v2: Vector) : Vector{
        return new Vector(v1.x * v2.x, v1.y * v2.y);
    }

    static ToGraph(v : Vector) : GraphPoint{
        return new GraphPoint((v.x - (v.display.screenWidth/2 + v.display.originTranslationVector.x))/v.display.unitToPixel, (v.y - (v.display.screenHeight/2 - v.display.originTranslationVector.y))/v.display.unitToPixel * -1);
    }

}

export class GraphPoint{
    private _x : number;
    get x() : number{
        return this._x;
    }
    private _y : number;
    get y() : number{
        return this._y;
    }
    private display : Display;

    constructor(__x : number, __y : number){
        this._x = __x;
        this._y = __y;
        this.display = Display.Instance;
    }

    ToScreen(){
        return new Vector(this._x * this.display.unitToPixel + this.display.screenWidth/2 + this.display.originTranslationVector.x, -this._y * this.display.unitToPixel + this.display.screenHeight/2 - this.display.originTranslationVector.y);
    }
}


export class GraphVector{
    public start : GraphPoint;
    public end : GraphPoint;
    private display: Display;

    constructor(_start : GraphPoint, _end : GraphPoint){
        this.start = _start;
        this.end = _end;
        this.display = Display.Instance;
    }

    get length(){
        return GraphVector.Length(this);
    }

    get displacement(){
        return Vector.Sub(this.end.ToScreen(), this.start.ToScreen()).Scale(1/this.display.unitToPixel);
    }

    static Length(graphVector: GraphVector) : number{
        return Vector.Length(Vector.Sub(graphVector.end.ToScreen(), graphVector.start.ToScreen()))/graphVector.display.unitToPixel;
    }
}

export class FluidParticle{
    public position : GraphPoint;
    public trailPositions : GraphPoint[];
    private _lifeTime : number;
    get lifeTime() : number{
        return this._lifeTime;
    }
    get fieldVector(){
        return this.display.FieldLogic(this.position);
    }

    private display : Display;
    

    constructor(_position : GraphPoint, __lifeTime : number){
        this.position = _position;
        this.trailPositions = [_position];
        this._lifeTime = __lifeTime;
        this.display = Display.Instance;
    }
    
    Update(deltaTime : number){

        this.display.fluidParticleManager.particleSpeeds.push(this.fieldVector.length)
        this._lifeTime -= deltaTime;

        let graphVector = this.display.FieldLogic(this.position);
        let unscaledDisplacement = graphVector.displacement
        let particleVelocity = Math.log(unscaledDisplacement.length + 10)* this.display.fluidParticleMaxVelocity;
        let displacement = Vector.Scale(unscaledDisplacement.unit, particleVelocity* deltaTime);
        this.position = Vector.ToGraph(Vector.Add(this.position.ToScreen(), displacement));

        if(this.trailPositions.length>=this.display.fluidParticleTrailLength){
            this.trailPositions.shift();
        }
        this.trailPositions.push(this.position);
    }


    //TODO
    // private RKFour(){

    // }

    // private eular(speed: number){


    // }

    


    Draw(){
        this.display.DrawParticle(this, "#2b2b2b");
    }
}

export class FluidParticleManager{
    private particles : FluidParticle[];
    public particleSpeeds: number[];
    private display : Display;
    get minX() : number{
        return -(this.display.screenWidth/2 + this.display.originTranslationVector.x)/this.display.unitToPixel;
    }
    get maxX() : number{
        return (this.display.screenWidth/2-this.display.originTranslationVector.x)/this.display.unitToPixel;
    }
    get minY() : number{
        return -(this.display.screenHeight/2 + this.display.originTranslationVector.y)/this.display.unitToPixel;
    }
    get maxY() : number{
        return (this.display.screenHeight/2-this.display.originTranslationVector.y)/this.display.unitToPixel;
    }

    constructor(){
        this.display = Display.Instance;
        this.particles = [];
        this.particleSpeeds = [];
    }

    RandomParticleGeneration(){
        while(this.particles.length < this.display.fluidParticleCount){
            let randomX = Math.random() * (this.maxX-this.minX) + this.minX;
            let randomY = Math.random() * (this.maxY-this.minY) + this.minY
            let randomLifeTime = Math.random() * this.display.fluidParticleLifeTime;
            let randomGraphPoint = new GraphPoint(randomX, randomY);
            this.particles.push(new FluidParticle(randomGraphPoint, randomLifeTime));
        }
    }

    Update(deltaTime : number){
        this.particleSpeeds.length = 0;
        this.RandomParticleGeneration();
        this.particles.forEach(particle => {
            particle.Update(deltaTime);
            if(particle.position.x < this.minX || particle.position.x > this.maxX || particle.position.y < this.minY || particle.position.y > this.maxY){
                this.particles.splice(this.particles.indexOf(particle), 1);
            }
            if(particle.lifeTime <= 0){
                this.particles.splice(this.particles.indexOf(particle), 1);
            }
            particle.Draw();
        });
    }
}


console.log("VECTOR ACTIVATED")