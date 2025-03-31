import { Application, Graphics, Ticker } from 'pixi.js';
import { Display } from './Display';
import { Vector } from './Vector';
import { UserInterface } from './UserInterface';


export class Game{
    private static instance: Game;
    private app: Application;
    private graphics: Graphics;
    private display: Display;
    private userInterface: UserInterface;

    constructor(_app: Application, _graphics: Graphics, _display: Display, _userInterface: UserInterface){
        this.app = _app;
        this.graphics = _graphics;
        this.display = _display;
        this.userInterface = _userInterface;

        // Append the application canvas to the document body
        document.getElementById('canvasElement')?.appendChild(this.app.canvas);
        this.app.stage.addChild(this.graphics);
        
    
        //Style
        document.body.style.backgroundColor = "#2b2b2b";
        document.body.style.margin = "0px";
        
        const ticker = new Ticker();
        ticker.add(() => this.Update(ticker.elapsedMS*0.001));
        ticker.start();
    }

    static get Instance(){
        return this.instance;
    }
    
    static async Initialize(){
        //Initialize Static Display Instance
        const graphics = new Graphics();
        Display.Initialize(graphics);
        const display = Display.Instance;
        
        //Initialize Application
        const app = new Application();
        await app.init({width: display.screenWidth, height: display.screenHeight, background: '#ffffff', sharedTicker: true, antialias:true});
        //Initialize UserInterface
        UserInterface.Initialize(app)
        const userInterface = UserInterface.Instance
        
        this.instance = new Game(app, graphics, display, userInterface)
    }
    
    private Update = (deltaTime:number)=>{ //deltaTime in seconds
        this.display.FieldLogicCompiler()
        this.Draw(deltaTime)
        this.display.t += deltaTime * this.display.tSpeed
    }
    
    private Draw = (deltaTime:number)=>{
        this.graphics.clear();
    
    
        this.display.DrawLine(new Vector(this.display.screenWidth/2+this.display.originTranslationVector.x,0), new Vector(this.display.screenWidth/2+this.display.originTranslationVector.x, this.display.screenHeight), 1, "#2b2b2b");
        this.display.DrawLine(new Vector(0, this.display.screenHeight/2-this.display.originTranslationVector.y), new Vector(this.display.screenWidth, this.display.screenHeight/2-this.display.originTranslationVector.y), 1, "#2b2b2b");
        
        if(this.display.isPlotFluidField){
            this.display.PlotFluidField(deltaTime);
        }
        if(this.display.isPlotVectorField){
            this.display.PlotField();
        }
        if(deltaTime>0.1){
            console.log("SLOW FRAME")
        }
    }
}


(async () => {
    await Game.Initialize();
})();
console.log("GAME ACTIVATED")