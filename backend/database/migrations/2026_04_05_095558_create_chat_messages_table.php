<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateChatMessagesTable extends Migration
{
    public function up()
    {
        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('session_id')->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->enum('role', ['user','assistant','system'])->default('user');
            $table->text('content');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->foreign('session_id')->references('id')->on('chat_sessions')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('chat_messages');
    }
}
