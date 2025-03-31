import {Graphics} from 'pixi.js';
import { Vector, GraphVector, GraphPoint, FluidParticleManager, FluidParticle } from "./Vector.js"
import { create, all, MathJsInstance, EvalFunction } from 'mathjs'
import katex from 'katex'
import "katex/dist/katex.min.css"

export class Display{
    private static instance : Display;
    static get Instance(){
        return this.instance
    }

    private math: MathJsInstance;
    private graphics : Graphics;
    unitToPixel : number;
    unitIntervals : number;
    precisionDP : number;
    epsilon : number;

    screenWidth : number;
    screenHeight : number;
    get halfScreen() : Vector{
        return new Vector(this.screenWidth / 2, this.screenHeight/2)
    }

    originTranslationVector : Vector;
    displayRange : number[];
    displayRangeX : number[];
    displayRangeY : number[];

    fluidParticleManager: FluidParticleManager;
    fluidParticleMaxVelocity : number;
    fluidParticleCount : number;
    fluidParticleLifeTime : number;
    fluidParticleTrailLength : number;
    fluidParticleTrailOptimizer : number;

    c : number;

    t: number;
    tSpeed: number;

    fieldXCode: EvalFunction|null;
    fieldXInput: string;
    oldFieldXInput: string;
    fieldXOutputElement: HTMLHeadingElement;
    fieldYCode: EvalFunction|null;
    fieldYInput: string;
    oldFieldYInput: string;
    fieldYOutputElement: HTMLHeadingElement;

    isPlotVectorField: boolean;
    isPlotFluidField: boolean;

    get maxMagnitudeVector(){
        return (this.unitToPixel-this.unitIntervals/4)/this.unitIntervals;
    } //Change to better Name TODO

    //CHANGE ALL TO PRIVATE WITH GET ONLY AND SET FOR SOME TODO

    constructor(_graphics : Graphics) {
        //Initialize Math.Js
        this.math = create(all, {})
        this.graphics = _graphics;
        this.screenWidth = 800;
        this.screenHeight = 480;

        this.unitToPixel = 80;
        this.unitIntervals = 1;
        this.precisionDP = 1;
        this.epsilon = Math.pow(10, -this.precisionDP);
        this.c = 1;
        this.t = 0;
        this.tSpeed = 0.5; //Change in t relative to worldTime, n:1 (s:s)

        this.fieldXCode = null;
        this.fieldYCode = null;
        this.fieldXInput = ''
        this.fieldYInput = ''
        this.oldFieldXInput = this.fieldXInput
        this.oldFieldYInput = this.fieldYInput

        this.fieldXOutputElement = document.getElementById("fieldXOutput") as HTMLHeadingElement;
        this.fieldYOutputElement = document.getElementById("fieldYOutput") as HTMLHeadingElement;

        this.isPlotVectorField = true;
        this.isPlotFluidField = true;

        this.originTranslationVector = new Vector(0,0);
        this.displayRangeX = [];
        this.displayRangeY = [];
        this.displayRange = [];
        this.FindDisplayRange();

        this.fluidParticleManager = new FluidParticleManager();
        this.fluidParticleMaxVelocity = 15;
        this.fluidParticleCount = 500;
        this.fluidParticleLifeTime = 10;
        this.fluidParticleTrailLength = 20;
        this.fluidParticleTrailOptimizer = 5; //Skips n-1 points per line in the trail
    }
    
    static Initialize(_graphics : Graphics){
        this.instance = new Display(_graphics)
        this.instance.fluidParticleManager = new FluidParticleManager();
    }
    

    TranslateOrigin(translation : Vector){
        this.originTranslationVector = Vector.Add(this.originTranslationVector, translation);
    }


    //TODO LIST
    //UPLOAD TO GITHUB
    //GET THE GPU TO DO CALCULATIOn
    //SEE IF THE PARTICLE SYSTEM WILL WORK FASTER
    //JOT DOWN ALL ARRAY READINGS AND SEE IF ANY OF THEM CAN BE COMBINED TO REDUCE REPETITONS

    private FindDisplayRange(){
        this.displayRangeX.length = 0;
        this.displayRangeY.length = 0;

        let xRange = Math.ceil(this.screenWidth/2/this.unitToPixel);
        let yRange = Math.ceil(this.screenHeight/2/this.unitToPixel);

        this.displayRange[0] = -xRange - Math.floor(this.originTranslationVector.x / this.unitToPixel) - 1;
        this.displayRange[1] = xRange - Math.ceil(this.originTranslationVector.x / this.unitToPixel) + 1;
        this.displayRange[2] = -yRange - Math.floor(this.originTranslationVector.y / this.unitToPixel) - 1;
        this.displayRange[3] = yRange - Math.ceil(this.originTranslationVector.y / this.unitToPixel) + 1;

        for (let i = 0; i <= this.displayRange[1]; i+=1/this.unitIntervals) {
            if(i>-(this.screenWidth/2 + this.originTranslationVector.x)/this.unitToPixel && i<(this.screenWidth/2-this.originTranslationVector.x)/this.unitToPixel){
                this.displayRangeX.push(i);
            }
        }
        for (let i = 0; i >= this.displayRange[0]; i-=1/this.unitIntervals) {
            if(i>-(this.screenWidth/2 + this.originTranslationVector.x)/this.unitToPixel && i<(this.screenWidth/2-this.originTranslationVector.x)/this.unitToPixel){
                this.displayRangeX.unshift(i);
            }
        }

        for (let i = 0; i <= this.displayRange[3]; i+=1/this.unitIntervals) {
            if(i>-(this.screenHeight/2 + this.originTranslationVector.y)/this.unitToPixel && i<(this.screenHeight/2-this.originTranslationVector.y)/this.unitToPixel){
                this.displayRangeY.push(i);
            }
        }
        for (let i = 0; i >= this.displayRange[2]; i-=1/this.unitIntervals) {
            if(i>-(this.screenHeight/2 + this.originTranslationVector.y)/this.unitToPixel && i<(this.screenHeight/2-this.originTranslationVector.y)/this.unitToPixel){
                this.displayRangeY.unshift(i);
            }
        }

    }

    PlotField(){
        this.FindDisplayRange();
        let maxMagnitude = 0;
        let validVectors : GraphVector[] = [];
        this.displayRangeX.forEach(x => {
            this.displayRangeY.forEach(y => {

                let resulatantField = this.FieldLogic(new GraphPoint(x,y));
                validVectors.push(resulatantField);
                let magnitude = GraphVector.Length(resulatantField) * this.unitToPixel;
                if(maxMagnitude<magnitude)
                {
                    maxMagnitude = magnitude;
                }

            });
        });
        validVectors.forEach(validVector => {
            this.DrawArrowLogScale(validVector, maxMagnitude, 5, "#2b2b2b")
        });
    }

    FieldLogicCompiler(){
        if(this.fieldXInput != this.oldFieldXInput){
            try {
                let parseX = this.math.parse(this.fieldXInput)
                this.fieldXCode = parseX.compile();
                katex.render(parseX.toTex(),this.fieldXOutputElement)
            } catch (error) {
                this.fieldXOutputElement.innerHTML = '<span style="color: red;">' + error?.toString() + '</span>'
            }
            this.oldFieldXInput = this.fieldXInput;
        }        
        if(this.fieldYInput != this.oldFieldYInput){
            try {
                let parseY = this.math.parse(this.fieldYInput)
                this.fieldYCode = parseY.compile()
                katex.render(parseY.toTex(),this.fieldYOutputElement)
            } catch (error) {
                this.fieldYOutputElement.innerHTML = '<span style="color: red;">' + error?.toString() + '</span>'
            }
            this.oldFieldYInput = this.fieldYInput;
        }
    }

    FieldLogic(graphPoint: GraphPoint) : GraphVector{
        let x = graphPoint.x;
        let y = graphPoint.y;
        let r = new Vector(x,y).length;
        let t = this.t; 

        let fieldX:number = 0;
        let fieldY:number = 0;

        try {
            fieldX = this.fieldXCode?.evaluate({x:x,y:y,r:r,t:t});
        } catch (error) {
            this.fieldXOutputElement.innerHTML = '<span style="color: red;">' + error?.toString() + '</span>'

        }
        try {
            fieldY = this.fieldYCode?.evaluate({x:x,y:y,r:r,t:t});
        } catch (error) {
            this.fieldYOutputElement.innerHTML = '<span style="color: red;">' + error?.toString() + '</span>'
        }
        //TODO Manage Run Time Error in the Evaluation and differen types of them
        //BUG Undeclared variable
        //BUG Invalid Expression
       
        //Field Logic

        // let fieldX = (x - 1) / Vector.Sub(r,new Vector(1,0)).lengthSquared - (x + 1) / Vector.Add(r, new Vector(1, 0)).lengthSquared; //Dipole
        // let fieldY = y / Vector.Sub(r,new Vector(1,0)).lengthSquared - y / Vector.Add(r, new Vector(1, 0)).lengthSquared;
        
        // let fieldX = Math.cos(t) * ((x - 1) / Vector.Sub(r,new Vector(1,0)).lengthSquared - (x + 1) / Vector.Add(r, new Vector(1, 0)).lengthSquared); // Sinusoidal Dipole
        // let fieldY = Math.cos(t) * (y / Vector.Sub(r,new Vector(1,0)).lengthSquared - y / Vector.Add(r, new Vector(1, 0)).lengthSquared);

        // let fieldX = y;
        // let fieldY = Math.cos(r.length);

        // let fieldX = Math.sin(t)*y;
        // let fieldY = -Math.cos(t)*x;

        return new GraphVector(new GraphPoint(x,y), new GraphPoint(x+fieldX,y+fieldY));
    }

    PlotPolarField(){
        this.FindDisplayRange();
        let maxMagnitude = 0;
        let validVectors : GraphVector[] = [];
        this.displayRangeX.forEach(x => {
            this.displayRangeY.forEach(y => {
                let r = (new Vector(x,y)).length;
                let theta = this.thetaCalculator(x,y);

                // Field Logic

                let fieldR = 2 / (r * r * r) * 2 * Math.cos(theta); //Dipole
                let fieldTheta = 2 / (r * r * r) * Math.sin(theta);

                let resulatantField = Vector.Add(Vector.Scale((new Vector(x,y)).unit, fieldR), Vector.Scale(Vector.Rotate((new Vector(x,y).unit),Math.PI/2), fieldTheta));
                let fieldX = resulatantField.x;
                let fieldY = resulatantField.y;

                let magnitude = (new Vector(fieldX, fieldY)).length * this.unitToPixel;
                if(maxMagnitude<magnitude)
                {
                    maxMagnitude = magnitude;
                }
                validVectors.push(new GraphVector(new GraphPoint(x,y), new GraphPoint(x+fieldX,y+fieldY)));
            });
        });
        validVectors.forEach(validVector => {
            this.DrawArrowLogScale(validVector, maxMagnitude, 5, "#2b2b2b")
        });
    }

    PlotFluidField(deltaTime : number){
        this.fluidParticleManager.Update(deltaTime);
    }

    thetaCalculator(x : number, y : number){
        if (y >= 0 && x >= 0)
            return Math.atan(y / x);
        else if (y >= 0 && x < 0)
            return Math.PI - Math.atan(y / -x);
        else if (y < 0 && x < 0)
            return Math.atan(-y / -x) + Math.PI;
        else if (y < 0 && x >= 0)
            return 2 * Math.PI - Math.atan(-y / x);
        else
        {
            console.log("ThetaCalculatorMalfunction");
            return 0;
        }
    }

    DrawLine(start : Vector, end : Vector, width : number, color : string, alpha : number = 1){

        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke({color: color, width: width, alpha: alpha});
    }

    DrawArrowRelativeScale(vector : GraphVector, maxMagnitude : number, width: number, color : string){
        let start : Vector = vector.start.ToScreen();
        let relativeScale = this.maxMagnitudeVector/maxMagnitude;
        let unscaledDisplacement : Vector = Vector.Sub(vector.end.ToScreen(),start)
        let end : Vector = Vector.Add(Vector.Scale(unscaledDisplacement, relativeScale), start)

        let displacement = Vector.Sub(end, start);
        let arrowLength = (displacement.length) * 0.2;
        let arrowWidth = arrowLength * 0.5;

        let arrowDisplacement : Vector = Vector.Scale((Vector.Rotate(displacement,Math.PI/2).unit), arrowLength/2);

        let arrowStart : Vector = Vector.Add(Vector.Sub(end, Vector.Scale(displacement.unit,arrowWidth/2)), arrowDisplacement);
        let arrowEnd : Vector = Vector.Sub(Vector.Sub(end, Vector.Scale(displacement.unit,arrowWidth/2)), arrowDisplacement);

        this.DrawLine(start, end, width, color);
        this.DrawLine(arrowStart, arrowEnd, arrowWidth, "#ff0000");
    }

    DrawArrowLogScale(vector : GraphVector, maxMagnitude : number, width: number, color : string){
        let start : Vector = vector.start.ToScreen();
        let unscaledDisplacement : Vector = Vector.Sub(vector.end.ToScreen(),start)
        let logScale = Math.log(unscaledDisplacement.length + 1)/Math.log(maxMagnitude + 1) * this.maxMagnitudeVector;
        let end : Vector = Vector.Add(Vector.Scale(unscaledDisplacement.unit, logScale), start)

        let displacement = Vector.Sub(end, start);
        let arrowLength = displacement.length * 0.4;
        let arrowWidth = arrowLength * 0.5;

        let arrowDisplacement : Vector = Vector.Scale(Vector.Rotate(displacement,Math.PI/2).unit, arrowLength/2);

        let arrowStart : Vector = Vector.Add(Vector.Sub(end, displacement.unit.Scale(arrowWidth/2)), arrowDisplacement);
        let arrowEnd : Vector = Vector.Sub(Vector.Sub(end, displacement.unit.Scale(arrowWidth/2)), arrowDisplacement);

        this.DrawLine(start, end, width, color);
        this.DrawLine(arrowStart, arrowEnd, arrowWidth, "#ff0000");
    }

    DrawPoint(point : GraphPoint, radius : number, color : string){
        let screenPoint = point.ToScreen();
        this.graphics.circle(screenPoint.x, screenPoint.y, radius);
        this.graphics.fill(color);
    }

    DrawParticle(particle: FluidParticle, color: string){
        this.DrawPoint(particle.position, 1, color);
        for (let i = particle.trailPositions.length-1; i >= this.fluidParticleTrailOptimizer; i-=this.fluidParticleTrailOptimizer) {
            this.DrawLine(particle.trailPositions[i].ToScreen(), particle.trailPositions[i-this.fluidParticleTrailOptimizer].ToScreen(), 1, color, (i)/(particle.trailPositions.length));
        }
    }

    ClearScreen(){
        this.graphics.clear();
    }
}


console.log("DISPLAY ACTIVATED")
