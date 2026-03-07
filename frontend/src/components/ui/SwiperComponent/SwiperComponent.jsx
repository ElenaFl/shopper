import React from "react";
import { Swiper, SwiperSlide } from 'swiper/react';
import {Pagination, Autoplay} from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import './SwiperComponent.module.css';
import { swiperList } from '../../../../swiperList.js'

/**
 * Компонент Swiper на странице Home.
 *
 */

export const SwiperComponent = () => {

    return (
        <div>
            <Swiper className="w-full h-161.5 mt-31"
                modules={[Pagination, Autoplay]}
                pagination={true}
                slidesPerView={1}
                loop={true}
                autoplay={{ delay: 4000 }}
                speed={1100}
                touchRatio={1}
            >
            {
                swiperList?.length>0 && swiperList?.map((item) => (
                    <SwiperSlide key={item?.id}>
                        <div className="w-full h-full relative">
                            <img src={item?.image} alt={item?.title} className="w-full h-full object-cover rounded-2xl" />
                            <div className='absolute left-0 top-[50%] translate-y-[-50%] px-12'>
                                <h2 className="text-white font-medium mb-4 text-4xl">{item?.title}</h2>
                                <p className="text-white mb-4 text-3xl">{item.currency} {item?.price.toFixed(2)}</p>
                                <button className="btn text-white border-white hover:border-transparent hover:bg-white hover:text-gray-200 border-2 px-7.75 py-3.25 rounded-md text-xl font-bold">View Product</button>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
};