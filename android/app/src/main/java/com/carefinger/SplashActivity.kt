package com.carefinger

import android.content.Intent
import android.graphics.drawable.ClipDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.doOnLayout

class SplashActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_splash)

    val splashZoomTop = findViewById<ImageView>(R.id.splashZoomTop)
    (splashZoomTop.drawable as? ClipDrawable)?.level = 6400
    splashZoomTop.scaleX = 0.94f
    splashZoomTop.scaleY = 0.94f
    splashZoomTop.alpha = 0.98f
    splashZoomTop.doOnLayout {
      splashZoomTop.pivotX = splashZoomTop.width / 2f
      splashZoomTop.pivotY = splashZoomTop.height * 0.28f
    }
    splashZoomTop.animate()
      .scaleX(1f)
      .scaleY(1f)
      .alpha(1f)
      .setDuration(1200)
      .start()

    Handler(Looper.getMainLooper()).postDelayed({
      startActivity(Intent(this, MainActivity::class.java))
      finish()
    }, 3000)
  }
}
