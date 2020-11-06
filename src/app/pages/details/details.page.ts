import { Component, OnInit } from '@angular/core';
import { Product } from 'src/app/interfaces/product';
import { LoadingController, ToastController, NavController, Platform } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ProductService } from 'src/app/services/product.service';
import { Camera } from '@ionic-native/camera/ngx';
import { File } from '@ionic-native/file/ngx';
import {AngularFireStorage} from '@angular/fire/storage';
import { finalize } from 'rxjs/operators'

@Component({
  selector: 'app-details',
  templateUrl: './details.page.html',
  styleUrls: ['./details.page.scss'],
})
export class DetailsPage implements OnInit {
  private product: Product = {};
  private loading: any;
  private productId: string = null;
  private productSubscription: Subscription;
  private camera: Camera;
  private file: File;
  private afStorage: AngularFireStorage;
  public uploadPercent: Observable<number>;
  public downloadUrl: Observable<string> 

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private authService: AuthService,
    private activeRoute: ActivatedRoute,
    private productService: ProductService,
    private navCtrl: NavController,
    private platform: Platform
  ) {
    this.productId = this.activeRoute.snapshot.params['id'];

    if (this.productId) this.loadProduct();

  }
  ngOnInit() { }
//colocando imagem
  async openGalery(){
    const options: CameraOptions = {
      quality: 100,
      destinationType: this.camera.DestinationType.FILE_URI,
      sourceType: this.camera.PictureSourceType.PHOTOLIBRARY,
      correctOrientation: true
    };

    try {
      const fileUri: string = await this.camera.getPicture(options);
      let file: string;

      if (this.platform.is('ios')){
        file = fileUri.split('/').pop();
      } else{
        file = fileUri.substring(fileUri.lastIndexOf('/') + 1, fileUri.indexOf('?'));
      }
      const path: string = fileUri.substring(0, fileUri.lastIndexOf('/'))

      const buffer: ArrayBuffer = await this.file.readAsArrayBuffer(path, file);
      const blob: Blob = new Blob ([buffer], {type:'image/jpeg'});
      
      this.uploadPicture(blob);

    }catch (error){
        console.error(error)
      }
    }

    uploadPicture(blob: Blob){
      const ref = this.afStorage.ref('ionic.jpg');
      const task = ref.put(blob);

      this.uploadPercent = task.percentageChanges();

      task.snapshotChanges().pipe(
        finalize(()=> this.downloadUrl = ref.getDownloadURL())
      ).subscribe()

    }
////////////////////////////////////////////////////////////////////////////
  ngOnDestroy(){
    if(this.productSubscription) this.productSubscription.unsubscribe();
  }

  loadProduct() {
    this.productSubscription = this.productService.getProduct(this.productId).subscribe(data => {
      this.product = data;
    })
  }
  async saveProduct() {
    await this.presentLoading();

    this.product.userId = this.authService.getAuth().currentUser.uid;

    if (this.productId) {
      try {
        await this.productService.updateProduct(this.productId, this.product);
        await this.loading.dismiss();

        this.navCtrl.navigateBack('/home');
      } catch (error) {
        error
        this.presentToast('Erro ao tentar salvar');
        this.loading.dismiss();
      }
    } else {
      this.product.createdAt = new Date().getTime();

      try {
        await this.productService.addProduct(this.product);
        await this.loading.dismiss();

        this.navCtrl.navigateBack('/home');
      } catch (error) {
        this.presentToast('Erro ao tentar salvar');
        this.loading.dismiss();
      }
    }
  }

  async presentLoading() {
    this.loading = await this.loadingCtrl.create({ message: 'Por favor aguarde...' });
    return this.loading.present();
  }
  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000 });
    toast.present();

  }

}
